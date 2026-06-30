const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const testFiles = fs.readdirSync(__dirname)
  .filter((f) => f.endsWith(".test.js"))
  .map((f) => path.join(__dirname, f));

let failed = false;

console.log(`Found ${testFiles.length} test files to run.`);

for (const file of testFiles) {
  const basename = path.basename(file);

  // Skip SMTP alert test if environment variable is not defined
  if (basename === "send-login-alert.test.js" && !process.env.TEST_EMAIL) {
    console.log(`[SKIP] Skipping ${basename} (TEST_EMAIL not set)`);
    continue;
  }

  console.log(`[RUN] Running test: ${basename}`);
  
  // Use shell: true with double-quoted file path for cross-platform space handling
  const result = spawnSync("npx", ["tsx", "-r", "./tests/helpers/register-paths.cjs", `"${file}"`], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/test",
      AUTH_SECRET: process.env.AUTH_SECRET || "ci-test-secret-value-12345678",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
    },
  });

  if (result.status !== 0) {
    console.error(`[FAIL] Test ${basename} failed with exit code ${result.status}`);
    failed = true;
  } else {
    console.log(`[PASS] Test ${basename} passed!\n`);
  }
}

if (failed) {
  console.error("Some tests failed!");
  process.exit(1);
} else {
  console.log("All tests completed successfully!");
  process.exit(0);
}
