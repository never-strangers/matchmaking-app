// Seed: free dating event in Manila for 25 people (16F / 9M), all checked-in.
// Usage:  npx tsx scripts/seed-dating-mnl-free-25.ts
// Or:     SEED_CONFIRM=true npx tsx scripts/seed.ts --config scripts/seed/configs/dating-mnl-free-25.json
import { execSync } from "child_process";
execSync(
  `SEED_CONFIRM=true npx tsx ${__dirname}/seed.ts --config ${__dirname}/seed/configs/dating-mnl-free-25.json`,
  { stdio: "inherit" }
);
