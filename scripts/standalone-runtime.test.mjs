import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("Docker runs the CommonJS standalone entrypoint inside the ESM package", () => {
  const dockerfile = fs.readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
  const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const command = JSON.parse(dockerfile.match(/^CMD (\[.+\])$/m)?.[1] ?? "null");
  assert.equal(packageJson.type, "module");
  assert.deepEqual(command, ["node", "server.cjs"]);
  assert.match(dockerfile, /^COPY .*\/app\/\.next\/standalone\/server\.js \.\/server\.cjs$/m);

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dimax-standalone-"));
  try {
    fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify({ type: packageJson.type }));
    fs.writeFileSync(path.join(directory, command[1]),
      "require('node:assert/strict').equal(typeof __dirname, 'string'); process.stdout.write('standalone-ok');");
    const result = spawnSync(process.execPath, [command[1]], {
      cwd: directory,
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.equal(result.stdout, "standalone-ok");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
