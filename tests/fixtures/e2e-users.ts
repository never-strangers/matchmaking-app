/**
 * Predefined E2E users. Seed them once with: npm run seed:e2e
 * Tests use these credentials only; no admin API calls during test run.
 */
import e2eUsersJson from "./e2e-users.json";

export type E2EUserStatus = "pending_verification" | "approved" | "rejected";

export type E2EUser = {
  email: string;
  password: string;
  status: E2EUserStatus;
};

export const E2E_USERS = e2eUsersJson as {
  pending: E2EUser;
  approved: E2EUser;
  rejected: E2EUser;
};

export const E2E_PENDING_USER = E2E_USERS.pending;
export const E2E_APPROVED_USER = E2E_USERS.approved;
export const E2E_REJECTED_USER = E2E_USERS.rejected;
