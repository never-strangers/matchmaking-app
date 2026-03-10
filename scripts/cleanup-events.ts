// DEPRECATED: use `npm run cleanup` instead.
// This file is kept for backwards-compatibility only and will be removed.
import { execSync } from "child_process";
execSync(
  `SEED_CONFIRM=true npx tsx ${__dirname}/cleanup.ts --label legacy-events`,
  { stdio: "inherit" }
);
