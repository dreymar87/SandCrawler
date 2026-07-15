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
  // On Windows npm installs shims as `.cmd` files; invoke them directly
  // rather than going through the shell. Avoids Node 24+'s DEP0190
  // deprecation warning about `shell: true` + args array.
  const target = process.platform === "win32" ? `${cmd}.cmd` : cmd;
  const r = spawnSync(target, args, { stdio: "inherit", env, shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("npx", ["vite", "build"]);
run("npx", doSync ? ["cap", "sync", "android"] : ["cap", "copy"]);
