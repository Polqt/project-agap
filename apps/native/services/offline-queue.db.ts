import { OfflineQueueRow, QueuedAction } from "@/types/offline";
import * as SQLite from "expo-sqlite";

const CREATE_QUEUE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS offline_queue (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    retries INTEGER DEFAULT 0
  );
`;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function mapRow(row: OfflineQueueRow): QueuedAction {
  return {
    id: row.id,
    type: row.type,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    createdAt: row.created_at,
    retries: row.retries,
  };
}

export async function getOfflineQueueDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("agap-offline.db").then(async (database) => {
      await database.execAsync(CREATE_QUEUE_TABLE_SQL);
      return database;
    });
  }

  return databasePromise;
}

export async function listQueuedActions() {
  const database = await getOfflineQueueDatabase();
  const rows = await database.getAllAsync<OfflineQueueRow>(
    "SELECT id, type, payload, created_at, retries FROM offline_queue ORDER BY created_at ASC",
  );

  return rows.map(mapRow);
}

export async function insertQueuedAction(action: QueuedAction) {
  const database = await getOfflineQueueDatabase();
  await database.runAsync(
    "INSERT OR REPLACE INTO offline_queue (id, type, payload, created_at, retries) VALUES (?, ?, ?, ?, ?)",
    action.id,
    action.type,
    JSON.stringify(action.payload),
    action.createdAt,
    action.retries,
  );
}

export async function deleteQueuedAction(id: string) {
  const database = await getOfflineQueueDatabase();
  await database.runAsync("DELETE FROM offline_queue WHERE id = ?", id);
}

export async function updateQueuedActionRetries(id: string, retries: number) {
  const database = await getOfflineQueueDatabase();
  await database.runAsync("UPDATE offline_queue SET retries = ? WHERE id = ?", retries, id);
}
