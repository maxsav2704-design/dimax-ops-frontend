// Guards block 3 of the admin audit: every form control has a programmatic
// name. jsx-a11y does not catch a bare <input>/<select> outside a <label>
// (inputs are in its ignore list by design), so this scan does: a control
// must carry aria-label / aria-labelledby / id (paired with htmlFor) / title,
// or sit inside a <label>. Placeholders are not names.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const APP = fileURLToPath(new URL("../app/", import.meta.url));
const OPEN = /<(input|select|textarea|Input|Textarea)\b/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry) && !/\.test\./.test(entry)) out.push(full);
  }
  return out;
}

/** Index just past the `>` that closes the tag opened at `start` (brace/quote aware). */
function tagEnd(src, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== "\\") quote = null;
    } else if (c === '"' || c === "'" || (c === "`" && depth > 0)) {
      quote = c;
    } else if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (c === ">" && depth === 0) return i;
  }
  return -1;
}

function insideLabel(src, pos) {
  const before = src.slice(0, pos);
  const open = before.lastIndexOf("<label");
  if (open < 0) return false;
  return !src.slice(open, pos).includes("</label>");
}

test("every form control has a programmatic name", () => {
  const offenders = [];
  for (const root of [SRC, APP]) {
    for (const file of walk(root)) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      if (rel.startsWith("components/ui/")) continue; // primitives take the name from their call site
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(OPEN)) {
        const end = tagEnd(src, m.index + m[0].length);
        const attrs = src.slice(m.index + m[0].length, end);
        if (/type\s*=\s*["']hidden/.test(attrs)) continue;
        if (/\baria-label\b|\baria-labelledby\b|\bid\s*=|\btitle\s*=/.test(attrs)) continue;
        if (insideLabel(src, m.index)) continue;
        const line = src.slice(0, m.index).split("\n").length;
        offenders.push(`${relative(join(SRC, ".."), file).replace(/\\/g, "/")}:${line} <${m[1]}>`);
      }
    }
  }
  assert.deepEqual(offenders, [], `Give these controls an accessible name (aria-label, id+htmlFor, or wrap in <label>):\n  ${offenders.join("\n  ")}`);
});
