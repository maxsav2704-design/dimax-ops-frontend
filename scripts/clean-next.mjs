import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const nextDir = ".next";

if (process.env.DIMAX_PRESERVE_NEXT_ROOT === "1" && existsSync(nextDir)) {
  for (const entry of readdirSync(nextDir)) {
    rmSync(join(nextDir, entry), { recursive: true, force: true });
  }
} else {
  rmSync(nextDir, { recursive: true, force: true });
}
