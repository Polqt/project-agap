import * as SQLite from "expo-sqlite";

const CREATE_DOCUMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS offline_documents (
    scope_id TEXT NOT NULL,
    collection TEXT NOT NULL,
    document_key TEXT NOT NULL,
    payload TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (scope_id, collection, document_key)
  );
`;

const CREATE_SYNC_STATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS offline_sync_state (
    scope_id TEXT NOT NULL,
    dataset TEXT NOT NULL,
    synced_at INTEGER NOT NULL,
    PRIMARY KEY (scope_id, dataset)
  );
`;

type OfflineDocumentRow = {
  scope_id: string;
  collection: string;
  document_key: string;
  payload: string;
  updated_at: number;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getOfflineDataDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("agap-offline-data.db").then(async (database) => {
      await database.execAsync(CREATE_DOCUMENTS_TABLE_SQL);
      await database.execAsync(CREATE_SYNC_STATE_TABLE_SQL);
      return database;
    });
  }

  return databasePromise;
}

function parsePayload<TValue>(payload: string) {
  return JSON.parse(payload) as TValue;
}

export async function writeOfflineDocument<TValue>(
  scopeId: string,
  collection: string,
  documentKey: string,
  value: TValue,
) {
  const database = await getOfflineDataDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO offline_documents
      (scope_id, collection, document_key, payload, updated_at)
      VALUES (?, ?, ?, ?, ?)`,
    scopeId,
    collection,
    documentKey,
    JSON.stringify(value),
    Date.now(),
  );
}

export async function deleteOfflineDocument(scopeId: string, collection: string, documentKey: string) {
  const database = await getOfflineDataDatabase();
  await database.runAsync(
    "DELETE FROM offline_documents WHERE scope_id = ? AND collection = ? AND document_key = ?",
    scopeId,
    collection,
    documentKey,
  );
}

export async function readOfflineDocument<TValue>(
  scopeId: string,
  collection: string,
  documentKey: string,
) {
  const database = await getOfflineDataDatabase();
  const row = await database.getFirstAsync<OfflineDocumentRow>(
    `SELECT scope_id, collection, document_key, payload, updated_at
       FROM offline_documents
      WHERE scope_id = ? AND collection = ? AND document_key = ?`,
    scopeId,
    collection,
    documentKey,
  );

  if (!row) {
    return null;
  }

  return parsePayload<TValue>(row.payload);
}

export async function listOfflineDocuments<TValue>(scopeId: string, collection: string) {
  const database = await getOfflineDataDatabase();
  const rows = await database.getAllAsync<OfflineDocumentRow>(
    `SELECT scope_id, collection, document_key, payload, updated_at
       FROM offline_documents
      WHERE scope_id = ?
        AND collection = ?
   ORDER BY updated_at DESC`,
    scopeId,
    collection,
  );

  return rows.map((row) => parsePayload<TValue>(row.payload));
}

export async function replaceOfflineCollection<TValue extends { id: string }>(
  scopeId: string,
  collection: string,
  items: TValue[],
) {
  const database = await getOfflineDataDatabase();
  // Do not use withTransactionAsync here — concurrent calls (e.g. Promise.all
  // in syncOfflineDatasets) would cause "cannot start a transaction within a
  // transaction". Individual runAsync calls are atomic enough for our needs;
  // a partial write is self-healing on the next sync.
  const now = Date.now();
  await database.runAsync(
    "DELETE FROM offline_documents WHERE scope_id = ? AND collection = ?",
    scopeId,
    collection,
  );
  for (const item of items) {
    await database.runAsync(
      `INSERT OR REPLACE INTO offline_documents
        (scope_id, collection, document_key, payload, updated_at)
        VALUES (?, ?, ?, ?, ?)`,
      scopeId,
      collection,
      item.id,
      JSON.stringify(item),
      now,
    );
  }
}

export async function setOfflineSyncTimestamp(scopeId: string, dataset: string, syncedAt = Date.now()) {
  const database = await getOfflineDataDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO offline_sync_state
      (scope_id, dataset, synced_at)
      VALUES (?, ?, ?)`,
    scopeId,
    dataset,
    syncedAt,
  );
}

export async function readOfflineSyncTimestamp(scopeId: string, dataset: string) {
  const database = await getOfflineDataDatabase();
  const row = await database.getFirstAsync<{ synced_at: number }>(
    "SELECT synced_at FROM offline_sync_state WHERE scope_id = ? AND dataset = ?",
    scopeId,
    dataset,
  );

  return row?.synced_at ?? null;
}

export async function readAllSyncTimestamps(scopeId: string) {
  const database = await getOfflineDataDatabase();
  const rows = await database.getAllAsync<{ dataset: string; synced_at: number }>(
    "SELECT dataset, synced_at FROM offline_sync_state WHERE scope_id = ?",
    scopeId,
  );

  const timestamps: Record<string, number> = {};
  for (const row of rows) {
    timestamps[row.dataset] = row.synced_at;
  }

  return timestamps;
}

export async function clearOfflineScope(scopeId: string) {
  const database = await getOfflineDataDatabase();
  await database.runAsync("DELETE FROM offline_documents WHERE scope_id = ?", scopeId);
  await database.runAsync("DELETE FROM offline_sync_state WHERE scope_id = ?", scopeId);
}
