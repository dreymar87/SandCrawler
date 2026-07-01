// Portable "build the web app for the native shell" helper.
// Sets VITE_PWA=0 (no service worker inside the WebView), runs the Vite
// build, then copies/syncs the assets into the Capacitor Android project.
//
//   node scripts/build-app.mjs         → vite build + cap copy
//   node scripts/build-app.mjs sync    → vite build + cap sync android
import { spawnSync } from "node:child_process";

const doSync = process.argv.includes("sync");
const env = { ...process.env, VITE_PWA: "0" };

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("npx", ["vite", "build"]);
run("npx", doSync ? ["cap", "sync", "android"] : ["cap", "copy"]);
