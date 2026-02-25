import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type TestUser = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  dob: string;
  gender: string;
  attractedTo?: string[];
  lookingFor?: string[];
  preferredLanguage: string;
  instagram: string;
  reason: string;
};

const AUTH_DIR = path.resolve(process.cwd(), "playwright/.auth");
const USER_FILE = path.join(AUTH_DIR, "test-user.json");

export const pendingStorageStatePath = path.join(AUTH_DIR, "pending-user.json");
export const approvedStorageStatePath = path.join(AUTH_DIR, "approved-user.json");

export async function ensureAuthDir(): Promise<void> {
  await mkdir(AUTH_DIR, { recursive: true });
}

export function createUniqueTestUser(): TestUser {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    email: `e2e+${stamp}@example.com`,
    password: `E2e!${stamp}Pass`,
    firstName: "E2E",
    lastName: `User_${stamp}`,
    city: "sg",
    dob: "1990-01-01",
    gender: "female",
    attractedTo: ["men"],
    lookingFor: ["friends"],
    preferredLanguage: "en",
    instagram: `e2e_${stamp}`,
    reason: "E2E test user for auth gating",
  };
}

export async function saveTestUser(user: TestUser): Promise<void> {
  await ensureAuthDir();
  await writeFile(USER_FILE, JSON.stringify(user, null, 2), "utf-8");
}

export async function loadTestUser(): Promise<TestUser | null> {
  try {
    const raw = await readFile(USER_FILE, "utf-8");
    return JSON.parse(raw) as TestUser;
  } catch {
    return null;
  }
}
