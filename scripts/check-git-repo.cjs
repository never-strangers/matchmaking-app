#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const gitDir = path.join(root, ".git");

if (!fs.existsSync(gitDir)) {
  console.error(`
⚠️  Not in the Git repo.

This folder has no .git directory. You may have opened a duplicate (e.g. the
other "neverstrangers" under iCloud Documents). Always open the folder where
"git status" works. Close this project and open that folder instead.

`);
  process.exit(1);
}

// ── Guard: detect & remove the iCloud "straight apostrophe" stub ──
// macOS iCloud creates a duplicate folder when any tool writes to a path
// using ASCII apostrophe (0x27 ') instead of the real curly apostrophe
// (U+2019 ') in "Mikhail's".  The stub has no .git and confuses editors.
const homeDir = require("os").homedir();
const stubDir = path.join(
  homeDir,
  "Documents",
  "Documents - Mikhail\u0027s MacBook Pro" // ASCII straight apostrophe
);
const realDir = path.join(
  homeDir,
  "Documents",
  "Documents - Mikhail\u2019s MacBook Pro" // Unicode curly apostrophe
);

if (fs.existsSync(stubDir) && fs.existsSync(realDir) && stubDir !== realDir) {
  const stubGit = path.join(stubDir, "neverstrangers", ".git");
  if (!fs.existsSync(stubGit)) {
    console.warn(`
⚠️  iCloud stub detected — removing duplicate folder:
    ${stubDir}

    The real repo lives at:
    ${realDir}

    A tool wrote to the wrong apostrophe path (ASCII ' vs Unicode ').
    Deleting the stub now to prevent confusion.
`);
    try {
      fs.rmSync(stubDir, { recursive: true, force: true });
      console.log("   ✅ Stub deleted.\n");
    } catch (err) {
      console.error("   ❌ Could not delete stub:", err.message);
      console.error("   Run manually: rm -rf '" + stubDir + "'\n");
    }
  }
}
