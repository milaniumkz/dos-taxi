import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationTemplateRenderer {
  render(
    template: string,
    payload: Record<string, unknown>,
  ): string {
    return template
      .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) =>
        this.stringify(payload[key]),
      )
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+\./g, '.')
      .replace(/\s+,/g, ',')
      .trim();
  }

  private stringify(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return JSON.stringify(value);
  }
}
