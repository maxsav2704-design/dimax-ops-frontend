import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Ratchet for arbitrary pixel font sizes (`text-[12px]`, `text-[10.5px]`, ...).
// The design system defines a type scale (`text-11` ... `text-24` and the
// `.type-*` utilities), but views accumulated ~1 450 ad-hoc sizes. This test
// freezes today's count per file: a file may only go down. New files start at 0.
// Regenerate on purpose with: TYPE_SCALE_WRITE_BASELINE=1 node --test scripts/type-scale-ratchet.test.mjs

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const baselinePath = path.join(root, "scripts", "type-scale-baseline.json");
const pattern = /text-\[[0-9.]+px\]/g;

function collect() {
  const counts = {};
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        const hits = (fs.readFileSync(full, "utf8").match(pattern) || []).length;
        if (hits > 0) counts[path.relative(root, full).split(path.sep).join("/")] = hits;
      }
    }
  };
  for (const folder of ["src", "app"]) walk(path.join(root, folder));
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

test("arbitrary pixel font sizes never grow per file (type-scale ratchet)", () => {
  const current = collect();
  if (process.env.TYPE_SCALE_WRITE_BASELINE === "1") {
    fs.writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`);
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const regressions = [];
  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline[file] ?? 0;
    if (count > allowed) regressions.push(`${file}: ${count} > ${allowed}`);
  }
  assert.deepEqual(regressions, [], "use the type scale (text-11..24 or .type-*) instead of text-[Npx]");
});
