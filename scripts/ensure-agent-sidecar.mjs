import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "apps/desktop/src-tauri/binaries");

const TARGETS = {
  "aarch64-apple-darwin": "agent-aarch64-apple-darwin",
  "x86_64-apple-darwin": "agent-x86_64-apple-darwin",
  "x86_64-pc-windows-msvc": "agent-x86_64-pc-windows-msvc.exe",
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

const rustTarget = resolveRustTarget();
const binaryName = TARGETS[rustTarget];

if (!binaryName) {
  console.error(`Unsupported Rust target for agent sidecar: ${rustTarget}`);
  process.exit(1);
}

const sidecarPath = path.join(outDir, binaryName);

if (!existsSync(sidecarPath)) {
  console.log(`Agent sidecar missing (${binaryName}), building...`);
  execSync("node scripts/build-agent-sidecar.mjs", { cwd: root, stdio: "inherit" });
}
