import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteExcludedCsvUploadRecord,
  getCsvUploadDuplicateSourceRecords,
} from "./csvUploadRepository";
import {
  buildCsvUploadDuplicateMetadata,
  canManageCsvUploadLifecycle,
  canShowCsvUploadActivateAction,
  canShowCsvUploadExcludeAction,
  canShowCsvUploadPermanentDeleteAction,
  getCsvUploadDuplicateDisplayKind,
  isValidCsvUploadId,
  mergeCsvUploadHistoryEntries,
} from "@/src/server/services/upload";

type DeleteResult = {
  data: { id: number } | null;
  error: unknown;
};

function createDeleteClient(result: DeleteResult) {
  const calls: Array<{
    method: string;
    args: unknown[];
  }> = [];

  const query = {
    delete() {
      calls.push({
        method: "delete",
        args: [],
      });
      return query;
    },
    eq(column: string, value: unknown) {
      calls.push({
        method: "eq",
        args: [column, value],
      });
      return query;
    },
    select(columns: string) {
      calls.push({
        method: "select",
        args: [columns],
      });
      return query;
    },
    async maybeSingle() {
      calls.push({
        method: "maybeSingle",
        args: [],
      });
      return result;
    },
  };

  return {
    calls,
    client: {
      from(table: string) {
        calls.push({
          method: "from",
          args: [table],
        });
        return query;
      },
    },
  };
}

function createDuplicateSourceClient(result: { data: unknown[]; error: unknown }) {
  const calls: Array<{
    method: string;
    args: unknown[];
  }> = [];

  const query = {
    select(columns: string) {
      calls.push({
        method: "select",
        args: [columns],
      });
      return query;
    },
    eq(column: string, value: unknown) {
      calls.push({
        method: "eq",
        args: [column, value],
      });
      return query;
    },
    order(column: string, options: unknown) {
      calls.push({
        method: "order",
        args: [column, options],
      });
      return query;
    },
    async returns() {
      calls.push({
        method: "returns",
        args: [],
      });
      return result;
    },
  };

  return {
    calls,
    client: {
      from(table: string) {
        calls.push({
          method: "from",
          args: [table],
        });
        return query;
      },
    },
  };
}

test("deleteExcludedCsvUploadRecord filters by id, company, workspace, and excluded status", async () => {
  const { client, calls } = createDeleteClient({
    data: {
      id: 123,
    },
    error: null,
  });

  const result = await deleteExcludedCsvUploadRecord({
    uploadId: 123,
    companyId: "company-a",
    workspaceId: "workspace-a",
    client: client as never,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    {
      method: "from",
      args: ["csv_uploads"],
    },
    {
      method: "delete",
      args: [],
    },
    {
      method: "eq",
      args: ["id", 123],
    },
    {
      method: "eq",
      args: ["company_id", "company-a"],
    },
    {
      method: "eq",
      args: ["workspace_id", "workspace-a"],
    },
    {
      method: "eq",
      args: ["status", "excluded"],
    },
    {
      method: "select",
      args: ["id"],
    },
    {
      method: "maybeSingle",
      args: [],
    },
  ]);
});

test("deleteExcludedCsvUploadRecord keeps no-row delete distinct from success", async () => {
  const { client } = createDeleteClient({
    data: null,
    error: null,
  });

  const result = await deleteExcludedCsvUploadRecord({
    uploadId: 123,
    companyId: "company-a",
    workspaceId: "workspace-a",
    client: client as never,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data, null);
});

test("deleteExcludedCsvUploadRecord exposes query errors without throwing", async () => {
  const cause = {
    message: "RLS denied",
  };
  const { client } = createDeleteClient({
    data: null,
    error: cause,
  });

  const result = await deleteExcludedCsvUploadRecord({
    uploadId: 123,
    companyId: "company-a",
    workspaceId: "workspace-a",
    client: client as never,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.cause, cause);
});

test("upload lifecycle permissions allow owner/admin and reject member/viewer", () => {
  assert.equal(canManageCsvUploadLifecycle("owner"), true);
  assert.equal(canManageCsvUploadLifecycle("admin"), true);
  assert.equal(canManageCsvUploadLifecycle("member"), false);
  assert.equal(canManageCsvUploadLifecycle("viewer"), false);
  assert.equal(canManageCsvUploadLifecycle(null), false);
});

test("upload history actions display only for database-backed rows and expected statuses", () => {
  assert.equal(canShowCsvUploadExcludeAction({
    role: "owner",
    status: "active",
    hasDatabaseId: true,
  }), true);
  assert.equal(canShowCsvUploadExcludeAction({
    role: "owner",
    status: "excluded",
    hasDatabaseId: true,
  }), false);
  assert.equal(canShowCsvUploadPermanentDeleteAction({
    role: "admin",
    status: "excluded",
    hasDatabaseId: true,
  }), true);
  assert.equal(canShowCsvUploadPermanentDeleteAction({
    role: "admin",
    status: "active",
    hasDatabaseId: true,
  }), false);
  assert.equal(canShowCsvUploadPermanentDeleteAction({
    role: "member",
    status: "excluded",
    hasDatabaseId: true,
  }), false);
  assert.equal(canShowCsvUploadPermanentDeleteAction({
    role: "owner",
    status: "excluded",
    hasDatabaseId: false,
  }), false);
  assert.equal(canShowCsvUploadActivateAction({
    role: "viewer",
    status: "excluded",
    hasDatabaseId: true,
  }), false);
});

test("csv upload id validation rejects invalid action input", () => {
  assert.equal(isValidCsvUploadId(1), true);
  assert.equal(isValidCsvUploadId(0), false);
  assert.equal(isValidCsvUploadId(-1), false);
  assert.equal(isValidCsvUploadId(1.2), false);
  assert.equal(isValidCsvUploadId("1"), false);
  assert.equal(isValidCsvUploadId(Number.MAX_SAFE_INTEGER + 1), false);
});

test("getCsvUploadDuplicateSourceRecords reads lightweight workspace-scoped metadata only", async () => {
  const { client, calls } = createDuplicateSourceClient({
    data: [],
    error: null,
  });

  const result = await getCsvUploadDuplicateSourceRecords({
    workspaceId: "workspace-a",
    client: client as never,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    {
      method: "from",
      args: ["csv_uploads"],
    },
    {
      method: "select",
      args: ["id, file_name, workspace_id, checksum, status"],
    },
    {
      method: "eq",
      args: ["workspace_id", "workspace-a"],
    },
    {
      method: "order",
      args: ["created_at", { ascending: false }],
    },
    {
      method: "returns",
      args: [],
    },
  ]);
});

test("duplicate metadata counts identical checksums in the same workspace result set", () => {
  const metadata = buildCsvUploadDuplicateMetadata([
    { id: 1, file_name: "a.csv", checksum: "same" },
    { id: 2, file_name: "b.csv", checksum: "same" },
  ]);

  assert.equal(metadata.get(1)?.identicalContentCount, 2);
  assert.equal(metadata.get(2)?.identicalContentCount, 2);
  assert.equal(getCsvUploadDuplicateDisplayKind(metadata.get(1)!), "identical");
});

test("duplicate metadata omits badges for unique checksums", () => {
  const metadata = buildCsvUploadDuplicateMetadata([
    { id: 1, file_name: "a.csv", checksum: "one" },
    { id: 2, file_name: "b.csv", checksum: "two" },
  ]);

  assert.equal(metadata.get(1)?.identicalContentCount, 1);
  assert.equal(metadata.get(1)?.hasSameNameDifferentContent, false);
  assert.equal(getCsvUploadDuplicateDisplayKind(metadata.get(1)!), null);
});

test("duplicate metadata does not treat null or blank checksums as identical content", () => {
  const metadata = buildCsvUploadDuplicateMetadata([
    { id: 1, file_name: "a.csv", checksum: null },
    { id: 2, file_name: "b.csv", checksum: "" },
    { id: 3, file_name: "c.csv", checksum: "   " },
  ]);

  assert.equal(metadata.get(1)?.identicalContentCount, 0);
  assert.equal(metadata.get(2)?.identicalContentCount, 0);
  assert.equal(metadata.get(3)?.identicalContentCount, 0);
});

test("duplicate metadata treats same file names with null checksums as same-name only", () => {
  const metadata = buildCsvUploadDuplicateMetadata([
    { id: 1, file_name: "daily.csv", checksum: null },
    { id: 2, file_name: "daily.csv", checksum: null },
  ]);

  assert.equal(metadata.get(1)?.identicalContentCount, 0);
  assert.equal(metadata.get(1)?.sameFileNameCount, 2);
  assert.equal(metadata.get(1)?.hasSameNameDifferentContent, true);
  assert.equal(getCsvUploadDuplicateDisplayKind(metadata.get(1)!), "same-name");
});

test("duplicate metadata treats same file names with missing and known checksum as same-name only", () => {
  const metadata = buildCsvUploadDuplicateMetadata([
    { id: 1, file_name: "daily.csv", checksum: "known" },
    { id: 2, file_name: "daily.csv", checksum: null },
  ]);

  assert.equal(metadata.get(1)?.identicalContentCount, 1);
  assert.equal(metadata.get(1)?.hasSameNameDifferentContent, true);
  assert.equal(getCsvUploadDuplicateDisplayKind(metadata.get(1)!), "same-name");
});

test("duplicate metadata marks same file name with different content", () => {
  const metadata = buildCsvUploadDuplicateMetadata([
    { id: 1, file_name: "daily.csv", checksum: "one" },
    { id: 2, file_name: "daily.csv", checksum: "two" },
  ]);

  assert.equal(metadata.get(1)?.sameFileNameCount, 2);
  assert.equal(metadata.get(1)?.hasSameNameDifferentContent, true);
  assert.equal(getCsvUploadDuplicateDisplayKind(metadata.get(1)!), "same-name");
});

test("duplicate metadata prioritizes identical content over same file name", () => {
  const metadata = buildCsvUploadDuplicateMetadata([
    { id: 1, file_name: "daily.csv", checksum: "same" },
    { id: 2, file_name: "daily.csv", checksum: "same" },
  ]);

  assert.equal(metadata.get(1)?.identicalContentCount, 2);
  assert.equal(metadata.get(1)?.sameFileNameCount, 2);
  assert.equal(metadata.get(1)?.hasSameNameDifferentContent, false);
  assert.equal(getCsvUploadDuplicateDisplayKind(metadata.get(1)!), "identical");
});

test("duplicate metadata includes active and excluded rows from the workspace result set", () => {
  const metadata = buildCsvUploadDuplicateMetadata([
    { id: 1, file_name: "active.csv", checksum: "same" },
    { id: 2, file_name: "excluded.csv", checksum: "same" },
  ]);

  assert.equal(metadata.get(1)?.identicalContentCount, 2);
  assert.equal(metadata.get(2)?.identicalContentCount, 2);
});

test("duplicate metadata follows refreshed records after permanent delete", () => {
  const beforeDelete = buildCsvUploadDuplicateMetadata([
    { id: 1, file_name: "daily.csv", checksum: "same" },
    { id: 2, file_name: "daily.csv", checksum: "same" },
  ]);
  const afterDelete = buildCsvUploadDuplicateMetadata([
    { id: 2, file_name: "daily.csv", checksum: "same" },
  ]);

  assert.equal(beforeDelete.get(2)?.identicalContentCount, 2);
  assert.equal(getCsvUploadDuplicateDisplayKind(beforeDelete.get(2)!), "identical");
  assert.equal(afterDelete.get(2)?.identicalContentCount, 1);
  assert.equal(getCsvUploadDuplicateDisplayKind(afterDelete.get(2)!), null);
});

test("upload history merge keeps active database rows backed by analysis snapshots", () => {
  const [entry] = mergeCsvUploadHistoryEntries({
    snapshots: [{
      id: "stored-1",
      fileName: "active.csv",
      dateKey: "2026-07-12",
      rowCount: 10,
      uploadedAt: "2026-07-12T00:00:00Z",
    }],
    metadata: [{
      id: 1,
      fileName: "active.csv",
      rowCount: 10,
      uploadedAt: "2026-07-12T00:00:00Z",
      snapshotDate: "2026-07-12",
      checksum: "active-checksum",
      status: "active",
      duplicateMetadata: {
        identicalContentCount: 1,
        sameFileNameCount: 1,
        hasSameNameDifferentContent: false,
      },
    }],
    emptyDuplicateMetadata: {
      identicalContentCount: 0,
      sameFileNameCount: 1,
      hasSameNameDifferentContent: false,
    },
  });

  assert.equal(entry?.databaseId, 1);
  assert.equal(entry?.status, "active");
  assert.equal(entry?.contentHash, "active-checksum");
});

test("upload history merge keeps excluded database rows even without analysis snapshots", () => {
  const [entry] = mergeCsvUploadHistoryEntries({
    snapshots: [],
    metadata: [{
      id: 2,
      fileName: "excluded.csv",
      rowCount: 12,
      uploadedAt: "2026-07-12T01:00:00Z",
      snapshotDate: "2026-07-12",
      checksum: "excluded-checksum",
      status: "excluded",
      duplicateMetadata: {
        identicalContentCount: 2,
        sameFileNameCount: 2,
        hasSameNameDifferentContent: false,
      },
    }],
    emptyDuplicateMetadata: {
      identicalContentCount: 0,
      sameFileNameCount: 1,
      hasSameNameDifferentContent: false,
    },
  });

  assert.equal(entry?.id, "stored-2");
  assert.equal(entry?.databaseId, 2);
  assert.equal(entry?.status, "excluded");
  assert.equal(entry?.duplicateMetadata.identicalContentCount, 2);
  assert.equal(canShowCsvUploadActivateAction({
    role: "owner",
    status: entry?.status,
    hasDatabaseId: Boolean(entry?.databaseId),
  }), true);
  assert.equal(canShowCsvUploadPermanentDeleteAction({
    role: "admin",
    status: entry?.status,
    hasDatabaseId: Boolean(entry?.databaseId),
  }), true);
});

test("upload history merge does not show permanent delete for fallback rows", () => {
  const [entry] = mergeCsvUploadHistoryEntries({
    snapshots: [{
      id: "local.csv__2026-07-12",
      fileName: "local.csv",
      dateKey: "2026-07-12",
      rowCount: 10,
      uploadedAt: "2026-07-12T00:00:00Z",
    }],
    metadata: [],
    emptyDuplicateMetadata: {
      identicalContentCount: 0,
      sameFileNameCount: 1,
      hasSameNameDifferentContent: false,
    },
  });

  assert.equal(entry?.databaseId, undefined);
  assert.equal(canShowCsvUploadPermanentDeleteAction({
    role: "owner",
    status: entry?.status,
    hasDatabaseId: Boolean(entry?.databaseId),
  }), false);
});

test("upload history merge removes rows absent from refreshed database history after permanent delete", () => {
  const beforeDelete = mergeCsvUploadHistoryEntries({
    snapshots: [],
    metadata: [{
      id: 2,
      fileName: "excluded.csv",
      rowCount: 12,
      uploadedAt: "2026-07-12T01:00:00Z",
      snapshotDate: "2026-07-12",
      checksum: "excluded-checksum",
      status: "excluded",
      duplicateMetadata: {
        identicalContentCount: 1,
        sameFileNameCount: 1,
        hasSameNameDifferentContent: false,
      },
    }],
    emptyDuplicateMetadata: {
      identicalContentCount: 0,
      sameFileNameCount: 1,
      hasSameNameDifferentContent: false,
    },
  });
  const afterDelete = mergeCsvUploadHistoryEntries({
    snapshots: [],
    metadata: [],
    emptyDuplicateMetadata: {
      identicalContentCount: 0,
      sameFileNameCount: 1,
      hasSameNameDifferentContent: false,
    },
  });

  assert.equal(beforeDelete.length, 1);
  assert.equal(afterDelete.length, 0);
});
