import { DEFAULT_ERROR_MESSAGES } from "../../modules/error-messages/default-error-messages";
export function publicErrorMessage(
  code: string,
  fallback: string,
  acceptLanguage?: string,
): string {
  const pair = DEFAULT_ERROR_MESSAGES[code];
  return pair
    ? pair[
        acceptLanguage?.split(",")[0].trim().toLowerCase().startsWith("kk")
          ? 1
          : 0
      ]
    : fallback;
}
