// DEPRECATED: use `npm run seed` instead.
// This file is kept for backwards-compatibility only and will be removed.
// Equivalent: npx tsx scripts/seed.ts --label test-data --config scripts/seed/configs/test-data.json
import { execSync } from "child_process";
execSync(
  `SEED_CONFIRM=true npx tsx ${__dirname}/seed.ts --config ${__dirname}/seed/configs/test-data.json`,
  { stdio: "inherit" }
);
