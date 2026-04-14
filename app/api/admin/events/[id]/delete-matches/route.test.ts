import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ─────────────────────────────────────────────────────────────────
// vi.mock is hoisted — factory functions must be self-contained (no outer variable refs)

vi.mock("@/lib/auth/getAuthUser", () => ({
  getAuthUser: vi.fn(),
}));

vi.mock("@/lib/supabase/serverClient", () => ({
  getServiceSupabaseClient: vi.fn(),
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { POST } from "./route";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockGetAuthUser = vi.mocked(getAuthUser);
const mockGetServiceSupabaseClient = vi.mocked(getServiceSupabaseClient);

function makeAdminSession() {
  return {
    profile_id: "admin-1",
    role: "admin",
    status: "approved",
    display_name: "Admin",
    invited_user_id: "admin-1",
    phone_e164: null,
    avatar_path: null,
    avatar_updated_at: null,
  };
}

function makeRequest() {
  return new Request("http://localhost/api/admin/events/evt-1/delete-matches", {
    method: "POST",
  });
}

function makeContext(eventId = "evt-1") {
  return { params: Promise.resolve({ id: eventId }) };
}

// Build a mock supabase client that tracks which tables were deleted
function buildMockSupabase(returnedData: Record<string, unknown[]> = {}) {
  const deletedTables: Record<string, boolean> = {};

  function makeMockTable(tableName: string) {
    return {
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: returnedData[tableName] ?? [],
            error: null,
          }),
        }),
      }),
    };
  }

  const client = {
    from: vi.fn((tableName: string) => {
      deletedTables[tableName] = true;
      return makeMockTable(tableName);
    }),
    _deletedTables: deletedTables,
  };

  return client;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/events/[id]/delete-matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const res = await POST(makeRequest() as never, makeContext());
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    mockGetAuthUser.mockResolvedValue({ ...makeAdminSession(), role: "user" });
    const res = await POST(makeRequest() as never, makeContext());
    expect(res.status).toBe(403);
  });

  it("deletes match_results, match_rounds, match_runs, match_reveal_queue", async () => {
    mockGetAuthUser.mockResolvedValue(makeAdminSession());
    const mockDb = buildMockSupabase();
    mockGetServiceSupabaseClient.mockReturnValue(mockDb as never);

    const res = await POST(makeRequest() as never, makeContext());
    expect(res.status).toBe(200);

    expect(mockDb._deletedTables["match_results"]).toBe(true);
    expect(mockDb._deletedTables["match_rounds"]).toBe(true);
    expect(mockDb._deletedTables["match_runs"]).toBe(true);
    expect(mockDb._deletedTables["match_reveal_queue"]).toBe(true);
  });

  it("does NOT delete event_attendees, answers, or likes", async () => {
    mockGetAuthUser.mockResolvedValue(makeAdminSession());
    const mockDb = buildMockSupabase();
    mockGetServiceSupabaseClient.mockReturnValue(mockDb as never);

    await POST(makeRequest() as never, makeContext());

    expect(mockDb._deletedTables["event_attendees"]).toBeUndefined();
    expect(mockDb._deletedTables["answers"]).toBeUndefined();
    expect(mockDb._deletedTables["likes"]).toBeUndefined();
  });

  it("returns deleted counts in response body", async () => {
    mockGetAuthUser.mockResolvedValue(makeAdminSession());
    const mockDb = buildMockSupabase({
      match_results: [{ id: "r1" }, { id: "r2" }, { id: "r3" }],
      match_rounds: [{ event_id: "evt-1" }],
      match_runs: [{ id: "run1" }, { id: "run2" }],
      match_reveal_queue: [{ id: "q1" }, { id: "q2" }],
    });
    mockGetServiceSupabaseClient.mockReturnValue(mockDb as never);

    const res = await POST(makeRequest() as never, makeContext());
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.deleted).toMatchObject({
      match_results: 3,
      match_rounds: 1,
      match_runs: 2,
      match_reveal_queue: 2,
    });
  });
});
