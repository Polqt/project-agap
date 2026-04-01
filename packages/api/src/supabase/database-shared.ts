import type { TableDefinition } from "./types";

export type Table<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown>,
  Update extends Record<string, unknown>,
> = TableDefinition<Row, Insert, Update>;

export type MutationShape<Row extends Record<string, unknown>, RequiredKeys extends keyof Row> = {
  [K in RequiredKeys]-?: Row[K];
} & {
  [K in Exclude<keyof Row, RequiredKeys>]?: Row[K];
};

export type ReadonlyMutationShape<
  Row extends Record<string, unknown>,
  ReadonlyKeys extends keyof Row,
  RequiredKeys extends keyof Row = never,
> = {
  [K in ReadonlyKeys]?: never;
} & MutationShape<Omit<Row, ReadonlyKeys>, Extract<RequiredKeys, keyof Omit<Row, ReadonlyKeys>>>;

export type Timestamped = {
  created_at: string;
};

export type TimestampedUpdated = Timestamped & {
  updated_at: string | null;
};

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type NullableGeoPoint = {
  latitude: number | null;
  longitude: number | null;
};

export type AlertLevel = "normal" | "advisory" | "watch" | "warning" | "danger";
export type PingChannel = "app" | "sms";
