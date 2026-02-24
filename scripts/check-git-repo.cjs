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
