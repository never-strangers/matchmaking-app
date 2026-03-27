// Seed: free dating event in KL for 30 people (15F / 15M), all checked-in.
// Usage:  npx tsx scripts/seed-dating-kl-free-30.ts
// Or:     SEED_CONFIRM=true npx tsx scripts/seed.ts --config scripts/seed/configs/dating-kl-free-30.json
import { execSync } from "child_process";
execSync(
  `SEED_CONFIRM=true npx tsx ${__dirname}/seed.ts --config ${__dirname}/seed/configs/dating-kl-free-30.json`,
  { stdio: "inherit" }
);
