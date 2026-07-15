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
  // Run through the shell so npm's `.cmd` shims resolve on Windows —
  // recent Node blocks spawning `.cmd`/`.bat` without a shell
  // (CVE-2024-27980). Pass a single command STRING (not shell:true + an
  // args array) so we don't trip Node's DEP0190 warning. Surface any
  // failure loudly: a silent no-op here would package stale web assets
  // into the APK.
  const line = [cmd, ...args].join(" ");
  const r = spawnSync(line, { stdio: "inherit", env, shell: true });
  if (r.error) {
    console.error(`\nbuild-app: failed to run "${line}": ${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(`\nbuild-app: "${line}" exited with code ${r.status}`);
    process.exit(r.status ?? 1);
  }
}

run("npx", ["vite", "build"]);
run("npx", doSync ? ["cap", "sync", "android"] : ["cap", "copy"]);
