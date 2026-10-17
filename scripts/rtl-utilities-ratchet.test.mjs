import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Ratchet for physical left/right Tailwind utilities (`pl-2`, `mr-1.5`, `-right-1`,
// `text-left`, `border-l`, ...). Hebrew lays the admin out right-to-left, so
// spacing and placement use the logical utilities (`ps-`, `me-`, `-end-`,
// `text-start`, `border-s`, ...). This test freezes today's count per file: a
// file may only go down, new files start at 0.
// Regenerate on purpose with: RTL_UTILITIES_WRITE_BASELINE=1 node --test scripts/rtl-utilities-ratchet.test.mjs

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const baselinePath = path.join(root, "scripts", "rtl-utilities-baseline.json");
// A utility token: optional variant prefix, optional negative sign, then a physical axis utility.
const pattern = /(?<=^|[\s"'`])(?:[a-z0-9:-]+:)?-?(?:pl|pr|ml|mr|left|right|inset-x-|scroll-pl|scroll-pr|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br)-[0-9a-z[\]./-]+|(?<=^|[\s"'`])(?:[a-z0-9:-]+:)?(?:text-left|text-right|border-l|border-r|float-left|float-right)(?=[\s"'`])/g;

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
  walk(path.join(root, "src"));
  walk(path.join(root, "app"));
  return counts;
}

test("physical left/right utilities never grow per file (rtl ratchet)", () => {
  const counts = collect();
  if (process.env.RTL_UTILITIES_WRITE_BASELINE === "1") {
    fs.writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`);
    return;
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const regressions = Object.entries(counts)
    .filter(([file, hits]) => hits > (baseline[file] ?? 0))
    .map(([file, hits]) => `${file}: ${hits} > ${baseline[file] ?? 0}`);
  assert.deepEqual(regressions, [], "use the logical utilities (ps-/pe-/ms-/me-/start/end) instead of pl-/pr-/ml-/mr-/left/right");
});
