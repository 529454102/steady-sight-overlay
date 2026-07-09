import { spawn } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { homedir } from "node:os";

const args = process.argv.slice(2);
const isWindows = process.platform === "win32";
const cargoName = isWindows ? "cargo.exe" : "cargo";

function canExecute(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function pathEnv() {
  const key = Object.keys(process.env).find((name) => name.toLowerCase() === "path") || "PATH";
  const value = process.env[key] || "";
  return { key, entries: value.split(delimiter).filter(Boolean) };
}

function cargoBinCandidates() {
  return [
    process.env.CARGO_HOME && join(process.env.CARGO_HOME, "bin"),
    process.env.USERPROFILE && join(process.env.USERPROFILE, ".cargo", "bin"),
    join(homedir(), ".cargo", "bin")
  ].filter(Boolean);
}

function ensureCargoOnPath() {
  const { key, entries } = pathEnv();
  const hasCargo = entries.some((entry) => canExecute(join(entry, cargoName)));

  if (hasCargo) return;

  const cargoBin = cargoBinCandidates().find((entry) => canExecute(join(entry, cargoName)));

  if (!cargoBin) {
    console.error(
      "Could not find cargo. Install Rust with rustup, then make sure .cargo/bin is on PATH."
    );
    process.exit(1);
  }

  process.env[key] = [cargoBin, ...entries].join(delimiter);
}

function tauriCommand() {
  const localName = isWindows ? "tauri.cmd" : "tauri";
  const localTauri = join(process.cwd(), "node_modules", ".bin", localName);
  return existsSync(localTauri) ? localTauri : "tauri";
}

ensureCargoOnPath();

const child = spawn(tauriCommand(), args, {
  env: process.env,
  shell: true,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
