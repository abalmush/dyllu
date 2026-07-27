const REQUIRED_MAJOR = 22;
const REQUIRED_MINOR = 12;

const [major, minor] = process.versions.node.split(".").map(Number);
const satisfied =
  major > REQUIRED_MAJOR ||
  (major === REQUIRED_MAJOR && minor >= REQUIRED_MINOR);

if (!satisfied) {
  const required = `${REQUIRED_MAJOR}.${REQUIRED_MINOR}.0`;
  console.error(
    [
      "",
      `  ✗ Wrong Node version: ${process.versions.node} (need >= ${required})`,
      "",
      "  Medusa 2.18 and Next 16 run unstably below this floor — random",
      "  crashes, stalled requests, empty product lists.",
      "",
      "  Fix: run  nvm use  (repo pins the version in .nvmrc), then retry.",
      "",
    ].join("\n")
  );
  process.exit(1);
}
