import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vitestCli = path.join(rootDir, "node_modules", "vitest", "vitest.mjs");
const sharedArgs = ["run", "--silent=passed-only"];
const isolatedTestFiles = [
  "src/test/DocumentsPage.test.tsx",
  "src/test/OperationsPage.test.tsx",
  "src/test/ProjectsPage.test.tsx",
];
const batches = [
  {
    label: "standard test files",
    args: [
      ...sharedArgs,
      ...isolatedTestFiles.flatMap((file) => ["--exclude", file]),
    ],
  },
  ...isolatedTestFiles.map((file) => ({
    label: `${path.basename(file)} integration tests`,
    args: [...sharedArgs, file],
  })),
];

for (const batch of batches) {
  process.stdout.write(`\nRunning ${batch.label}...\n`);
  const result = spawnSync(process.execPath, [vitestCli, ...batch.args], {
    cwd: rootDir,
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
