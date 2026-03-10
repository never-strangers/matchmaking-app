// DEPRECATED: use `npm run seed` instead.
// This file is kept for backwards-compatibility only and will be removed.
// Equivalent: npx tsx scripts/seed.ts --label legacy-events --config scripts/seed/configs/legacy-events.json
import { execSync } from "child_process";
execSync(
  `SEED_CONFIRM=true npx tsx ${__dirname}/seed.ts --config ${__dirname}/seed/configs/legacy-events.json`,
  { stdio: "inherit" }
);
