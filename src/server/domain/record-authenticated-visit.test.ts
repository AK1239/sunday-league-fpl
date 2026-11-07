import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockSelect, mockInsert, mockWriteAuditLog } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockWriteAuditLog: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  getDb: () => ({
    select: mockSelect,
    insert: () => ({ values: mockInsert }),
  }),
}));

vi.mock("./audit-log", () => ({
  writeAuditLog: mockWriteAuditLog,
}));

import { recordAuthenticatedVisit } from "./record-authenticated-visit";

function chainLimit(rows: unknown[]) {
  return {
    from: () => ({
      where: () => ({
        limit: async () => rows,
      }),
    }),
  };
}

describe("recordAuthenticatedVisit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteAuditLog.mockResolvedValue(undefined);
  });

  it("writes auth.visit when none recent", async () => {
    mockSelect.mockReturnValue(chainLimit([]));
    await recordAuthenticatedVisit({
      userId: "u1",
      role: "manager",
      path: "/my",
      ipAddress: "1.2.3.4",
      userAgent: "test",
    });
    expect(mockWriteAuditLog).toHaveBeenCalledOnce();
    expect(mockWriteAuditLog.mock.calls[0]![1]).toMatchObject({
      action: "auth.visit",
      userId: "u1",
    });
  });

  it("skips when a visit was logged within the throttle window", async () => {
    mockSelect.mockReturnValue(chainLimit([{ id: "recent" }]));
    await recordAuthenticatedVisit({
      userId: "u1",
      role: "manager",
      path: "/pick",
      ipAddress: null,
      userAgent: null,
    });
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});
