const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const backendPort = process.env.BACKEND_PORT || "5328";
const frontendPort = process.env.FRONTEND_PORT || "3000";
const isWindows = process.platform === "win32";

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#")) {
      continue;
    }
    const index = raw.indexOf("=");
    if (index <= 0) {
      continue;
    }
    const key = raw.slice(0, index).trim();
    let value = raw.slice(index + 1).trim();

    const hasWrappedQuotes =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));

    if (!hasWrappedQuotes) {
      const commentIndex = value.indexOf(" #");
      if (commentIndex >= 0) {
        value = value.slice(0, commentIndex).trim();
      }
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function buildEnv(extraEnv = {}) {
  const merged = { ...process.env, ...parseDotEnv(envPath), ...extraEnv };
  return Object.fromEntries(
    Object.entries(merged)
      .filter(([key, value]) => key && value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

function run(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || rootDir,
    env: buildEnv(options.extraEnv),
    stdio: "inherit",
    shell: isWindows,
    windowsHide: false,
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed to start`, error);
    process.exitCode = 1;
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
}

const pnpmCommand = isWindows ? "pnpm.cmd" : "pnpm";
const pythonCommand = process.env.PYTHON || "python";
const sharedToken = process.env.BACKEND_INTERNAL_TOKEN || process.env.NEXTAUTH_SECRET || "dev-internal-token";
const sharedEnv = {
  BACKEND_PORT: backendPort,
  FRONTEND_PORT: frontendPort,
  FLASK_DEBUG: process.env.FLASK_DEBUG || "1",
  BACKEND_INTERNAL_TOKEN: sharedToken,
  FLASK_API_URL: process.env.FLASK_API_URL || `http://127.0.0.1:${backendPort}`,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || `http://localhost:${frontendPort}`,
};

const backend = run("backend", pythonCommand, ["backend/app.py"], {
  extraEnv: sharedEnv,
});
const frontend = run(
  "frontend",
  pnpmCommand,
  ["exec", "next", "dev", "--port", frontendPort],
  {
    cwd: path.join(rootDir, "frontend"),
    extraEnv: sharedEnv,
  }
);

function shutdown(signal) {
  if (backend && !backend.killed) {
    backend.kill(signal);
  }
  if (frontend && !frontend.killed) {
    frontend.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
