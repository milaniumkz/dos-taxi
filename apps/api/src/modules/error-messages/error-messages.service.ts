import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { DEFAULT_ERROR_MESSAGES } from "./default-error-messages";

export type ErrorCatalog = {
  version: string;
  messages: { ru: Record<string, string>; kk: Record<string, string> };
};

@Injectable()
export class ErrorMessagesService {
  private cached?: { expires: number; catalog: ErrorCatalog };
  constructor(private readonly database: DataSource) {}

  async catalog(): Promise<ErrorCatalog> {
    if (this.cached && this.cached.expires > Date.now())
      return this.cached.catalog;
    const messages: ErrorCatalog["messages"] = { ru: {}, kk: {} };
    for (const [code, pair] of Object.entries(DEFAULT_ERROR_MESSAGES)) {
      messages.ru[code] = pair[0];
      messages.kk[code] = pair[1];
    }
    let version = "2026-10-08";
    try {
      const rows: {
        code: string;
        message_ru: string;
        message_kk: string;
        updated_at: Date;
      }[] = await this.database.query(
        "SELECT code, message_ru, message_kk, updated_at FROM application_error_messages",
      );
      for (const row of rows) {
        messages.ru[row.code] = row.message_ru;
        messages.kk[row.code] = row.message_kk;
        const timestamp = new Date(row.updated_at).toISOString();
        if (timestamp > version) version = timestamp;
      }
    } catch {
      // Error reporting must still work if the database is temporarily unavailable.
    }
    const catalog = { version, messages };
    this.cached = { expires: Date.now() + 5000, catalog };
    return catalog;
  }

  async message(
    code: string,
    fallback: string,
    language?: string,
  ): Promise<string> {
    const catalog = await this.catalog();
    const locale = language?.split(",")[0].trim().toLowerCase().startsWith("kk")
      ? "kk"
      : "ru";
    return catalog.messages[locale][code] ?? fallback;
  }

  async update(code: string, ru: string, kk: string): Promise<ErrorCatalog> {
    if (!Object.hasOwn(DEFAULT_ERROR_MESSAGES, code))
      throw new NotFoundException({
        code: "ERROR_MESSAGE_UNKNOWN",
        message: "Unknown error code",
      });
    await this.database.query(
      `INSERT INTO application_error_messages (code, message_ru, message_kk) VALUES ($1, $2, $3)
      ON CONFLICT (code) DO UPDATE SET message_ru = EXCLUDED.message_ru, message_kk = EXCLUDED.message_kk, updated_at = clock_timestamp()`,
      [code, ru, kk],
    );
    this.cached = undefined;
    return this.catalog();
  }
}
