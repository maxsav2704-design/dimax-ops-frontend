// Guards the i18n consolidation: components take tri-lingual inline copy from
// useCopy() ("@/lib/i18n") and plain functions from pickLocale()/localeCopy()
// ("@/lib/locale"). A new hand-rolled `(en, ru, he) => locale === "ru" ? ...`
// helper fails this test; add the string to the allowlist only with a reason.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = fileURLToPath(new URL("../src/", import.meta.url));

// Files that legitimately define the shape or the single implementation.
const ALLOWLIST = new Set([
  "lib/locale.ts",
  "lib/i18n.tsx",
  "components/calendar/CalendarScheduleSurface.tsx", // `type Copy = (en, ru, he) => string` prop contract
  "views/installer/IssuesPage.tsx", // `type CopyFn` prop contract for its sub-components
]);

const HELPER_BODY = /\(en: string, ru: string, he: string\)\s*=>\s*(\{|locale ===|\[en, ru, he\])/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry)) out.push(full);
  }
  return out;
}

test("no component re-implements the (en, ru, he) locale picker", () => {
  const offenders = [];
  for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (ALLOWLIST.has(rel)) continue;
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      if (HELPER_BODY.test(line) || (/\(en: string, ru: string, he: string\)\s*=>\s*$/.test(line) && /locale ===/.test(lines[index + 1] ?? ""))) {
        offenders.push(`${rel}:${index + 1}`);
      }
    });
  }
  assert.deepEqual(offenders, [], `Use useCopy() / pickLocale() instead of a local helper:\n  ${offenders.join("\n  ")}`);
});
