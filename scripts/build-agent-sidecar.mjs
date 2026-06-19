import * as esbuild from "esbuild";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "apps/desktop/src-tauri/binaries");
const bundlePath = path.join(outDir, "agent-bundle.cjs");

const TARGETS = {
  "aarch64-apple-darwin": {
    name: "agent-aarch64-apple-darwin",
    bun: "bun-darwin-arm64",
  },
  "x86_64-apple-darwin": {
    name: "agent-x86_64-apple-darwin",
    bun: "bun-darwin-x64",
  },
  "x86_64-pc-windows-msvc": {
    name: "agent-x86_64-pc-windows-msvc.exe",
    bun: "bun-windows-x64",
  },
};

function resolveRustTarget() {
  if (process.env.TAURI_TARGET?.trim()) {
    return process.env.TAURI_TARGET.trim();
  }
  if (process.env.CARGO_BUILD_TARGET?.trim()) {
    return process.env.CARGO_BUILD_TARGET.trim();
  }
  return execSync("rustc --print host-tuple", { cwd: root, encoding: "utf8" }).trim();
}

function ensureBun() {
  try {
    execSync("bun --version", { cwd: root, stdio: "ignore" });
    return "bun";
  } catch {
    const installDir = path.join(root, ".bun");
    const bunBin =
      process.platform === "win32"
        ? path.join(installDir, "bin", "bun.exe")
        : path.join(installDir, "bin", "bun");
    if (!existsSync(bunBin)) {
      console.log("Installing Bun for sidecar compilation...");
      execSync("curl -fsSL https://bun.sh/install | bash", {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, BUN_INSTALL: installDir },
      });
    }
    return bunBin;
  }
}

const rustTarget = resolveRustTarget();
const target = TARGETS[rustTarget];

if (!target) {
  console.error(`Unsupported Rust target for agent sidecar: ${rustTarget}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

console.log(`Bundling agent runtime -> ${bundlePath}`);
await esbuild.build({
  entryPoints: [path.join(root, "packages/agent-runtime/src/server.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: bundlePath,
  format: "cjs",
  sourcemap: false,
  logLevel: "info",
});

const bun = ensureBun();
const compileOut = path.join(outDir, target.name);
rmSync(compileOut, { force: true });

console.log(`Compiling agent sidecar for ${rustTarget}`);
execSync(
  `"${bun}" build "${bundlePath}" --compile --target=${target.bun} --outfile "${compileOut}"`,
  {
    cwd: root,
    stdio: "inherit",
  },
);

rmSync(bundlePath, { force: true });
console.log(`Agent sidecar ready: ${compileOut}`);
