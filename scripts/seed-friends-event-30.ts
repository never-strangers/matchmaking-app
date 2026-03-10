// DEPRECATED: use `npm run seed` instead.
// This file is kept for backwards-compatibility only and will be removed.
// Equivalent: npx tsx scripts/seed.ts --label demo-bkk-friends-30 --config scripts/seed/configs/demo-bkk-friends-30.json
import { execSync } from "child_process";
execSync(
  `SEED_CONFIRM=true npx tsx ${__dirname}/seed.ts --config ${__dirname}/seed/configs/demo-bkk-friends-30.json`,
  { stdio: "inherit" }
);
