"""Opt-in fixture for the disposable CI database, never a working installation."""
import os
from pathlib import Path
import sys
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import create_engine, select, func
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security.password import hash_password
from app.modules.identity.domain.enums import UserRole
from app.modules.identity.infrastructure.models import CompanyORM, UserORM, AdminProfileORM
from app.modules.outbox.domain.enums import OutboxChannel, OutboxStatus
from app.modules.outbox.infrastructure.models import OutboxMessageORM
from app.modules.outbox.infrastructure.recovery_models import OutboxRecoveryDecisionORM
from app.modules.outbox.infrastructure.repositories import OutboxRepository


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


url = make_url(settings.DATABASE_URL)
require(os.environ.get("GITHUB_ACTIONS") == "true", "Disposable CI runner required")
require(os.environ.get("DIMAX_RECOVERY_UI_TEST") == "synthetic-only", "Explicit opt-in required")
require(os.environ.get("APP_ENV") == "test", "Test environment required")
require(url.host == "127.0.0.1" and url.database == "dimax_recovery_ui", "Unsafe database target")
require(not Path(".env").exists(), "Dotenv files are forbidden")
require(not settings.EMAIL_ENABLED and not settings.WHATSAPP_ENABLED and not settings.AI_ENABLED, "External delivery must be disabled")
require(str(settings.OUTBOX_RECOVERY_EPOCH) == "00000000-0000-4000-8000-000000000099", "Unexpected recovery epoch")

engine = create_engine(settings.DATABASE_URL)
with Session(engine) as session:
    if sys.argv[1:] == ["verify"]:
        require(session.scalar(select(func.count()).select_from(OutboxRecoveryDecisionORM)) == 9, "Expected exactly nine decisions")
        for index in range(1, 4):
            company = UUID(f"00000000-0000-4000-8000-{index:012d}")
            rows = session.scalars(select(OutboxMessageORM).where(OutboxMessageORM.company_id == company)).all()
            require(len(rows) == 3, "Messages must not be recreated")
            require(sum(row.status == OutboxStatus.SENT for row in rows) == 1, "Only provider-accepted mail may be marked sent")
            ready = OutboxRepository(session).lock_next_batch(company_id=company)
            require(len(ready) == 1 and ready[0].payload["subject"] == "Synthetic RETRY", "Held/accepted messages must not be dispatched")
            session.rollback()
        print("PASS: 9 immutable decisions, 9 original messages, 3 authorized retries; held mail remains blocked")
    else:
        require(not sys.argv[1:], "Unknown fixture command")
        require(session.scalar(select(func.count()).select_from(CompanyORM)) == 0, "Refusing to seed a non-empty database")
        for index in range(1, 4):
            company = UUID(f"00000000-0000-4000-8000-{index:012d}")
            session.add(CompanyORM(id=company, name=f"Synthetic recovery UI {index}"))
            session.flush()
            for scope in ("OWNER", "OPERATIONS"):
                user = UserORM(company_id=company, email=f"{scope.lower()}@example.com", full_name=f"Synthetic {scope}",
                               role=UserRole.ADMIN, password_hash=hash_password("Synthetic-CI-only-42!"))
                session.add(user)
                session.flush()
                session.add(AdminProfileORM(company_id=company, user_id=user.id, admin_scope=scope))
            for action in ("HOLD", "RETRY", "ACCEPTED"):
                session.add(OutboxMessageORM(company_id=company, channel=OutboxChannel.EMAIL, status=OutboxStatus.PENDING,
                            scheduled_at=datetime(2020, 1, 1, tzinfo=timezone.utc), attempts=0, max_attempts=5,
                            payload={"to_email": "factory@dimax.example", "subject": f"Synthetic {action}", "body_text": "Synthetic recovery UI acceptance"}))
        session.commit()
        print("Seeded three synthetic companies; no workers or external delivery")
engine.dispose()
