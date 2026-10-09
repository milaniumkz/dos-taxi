import { EntityManager } from "typeorm";

export function driverBonusTimezone(timezone?: string): string {
  try {
    if (timezone) {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      return timezone;
    }
  } catch {
    /* Keep a valid zone for legacy profiles. */
  }
  return "Asia/Almaty";
}

/** Calendar boundaries in PostgreSQL handle local midnight and DST correctly. */
export async function driverBonusDay(
  manager: EntityManager,
  timezone: string,
  at: Date,
) {
  const rows: { day: string; start: Date; end: Date }[] = await manager.query(
    `SELECT
    to_char($1::timestamptz AT TIME ZONE $2, 'YYYY-MM-DD') AS day,
    date_trunc('day', $1::timestamptz AT TIME ZONE $2) AT TIME ZONE $2 AS start,
    (date_trunc('day', $1::timestamptz AT TIME ZONE $2) + interval '1 day') AT TIME ZONE $2 AS "end"`,
    [at, timezone],
  );
  return rows[0];
}
