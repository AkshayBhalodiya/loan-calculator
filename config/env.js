const fs = require("fs");
const path = require("path");

function checkEnv() {
  // Skip env validation at build time.
  // NEXT_PHASE is not yet set when next.config.ts is evaluated,
  // so we use CI flag and VERCEL_ENV as reliable indicators.
  const isBuild =
    process.env.CI === "1" ||
    process.env.CI === "true" ||
    process.env.VERCEL === "1" ||
    process.env.NEXT_PHASE === "phase-production-build";

  if (isBuild) {
    return;
  }

  const examplePath = path.resolve(process.cwd(), ".env.example");
  if (!fs.existsSync(examplePath)) {
    return;
  }

  const content = fs.readFileSync(examplePath, "utf8");
  const missing = [];
  const lines = content.split(/\r?\n/);

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) {
      continue;
    }

    const key = line.substring(0, eqIdx).trim();
    if (!key) {
      continue;
    }

    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `CRITICAL STARTUP ERROR: Missing required environment variables in the environment:\n` +
        missing.map((k) => `  - ${k}`).join("\n") +
        `\n\nPlease define them in your environment or a .env file.`
    );
  }
}

checkEnv();
