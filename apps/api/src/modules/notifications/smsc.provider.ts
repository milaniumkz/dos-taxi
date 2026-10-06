import { ConfigService } from "@nestjs/config";
import { Dispatcher, EnvHttpProxyAgent } from "undici";

type SmscResult = { id: number; cnt: number };
let proxyDispatcher: Dispatcher | undefined;

function proxyOptions(): { dispatcher?: Dispatcher } {
  if (
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy
  ) {
    // Node 20 fetch does not read proxy variables automatically. Honor the
    // platform HTTPS proxy (including destination-scoped secret injection).
    proxyDispatcher ??= new EnvHttpProxyAgent();
    return { dispatcher: proxyDispatcher };
  }
  return {};
}

/** SMSC accepts messages over HTTPS; acceptance does not mean handset delivery. */
export async function sendSmscSms(
  config: ConfigService,
  phone: string,
  message: string,
): Promise<SmscResult> {
  const login = config.get<string>("SMSC_LOGIN");
  const password = config.get<string>("SMSC_PASSWORD");
  if (!login || !password) {
    throw new Error("SMSC_LOGIN and SMSC_PASSWORD are required");
  }

  const digits = phone.replace(/\D/g, "");
  const recipient =
    digits.length === 11 && digits.startsWith("8")
      ? `7${digits.slice(1)}`
      : digits;
  if (!/^[1-9]\d{9,14}$/.test(recipient)) {
    throw new Error("SMSC recipient must be an international phone number");
  }

  const body = new URLSearchParams({
    login,
    psw: password,
    phones: recipient,
    mes: message,
    charset: "utf-8",
    fmt: "3",
  });
  const sender = config.get<string>("SMSC_SENDER")?.trim();
  if (sender) body.set("sender", sender);

  let response: Response;
  try {
    const options = {
      ...proxyOptions(),
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      redirect: "error" as const,
      signal: AbortSignal.timeout(10_000),
    };
    response = await fetch("https://smsc.kz/sys/send.php", options);
  } catch {
    // Never log request bodies or provider responses, which may echo credentials.
    throw new Error("SMSC request failed or timed out; acceptance is unknown");
  }
  if (!response.ok) {
    throw new Error(`SMSC HTTP error ${response.status}`);
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error("SMSC returned an invalid JSON response");
  }
  if (!result || typeof result !== "object") {
    throw new Error("SMSC returned an invalid response");
  }
  const payload = result as Record<string, unknown>;
  if ("error" in payload || "error_code" in payload) {
    const code = Number(payload.error_code);
    throw new Error(
      `SMSC rejected the message (code ${Number.isInteger(code) ? code : "unknown"})`,
    );
  }
  if (
    typeof payload.id !== "number" ||
    !Number.isSafeInteger(payload.id) ||
    payload.id <= 0 ||
    typeof payload.cnt !== "number" ||
    !Number.isSafeInteger(payload.cnt) ||
    payload.cnt <= 0
  ) {
    throw new Error("SMSC did not confirm message acceptance");
  }
  return { id: payload.id, cnt: payload.cnt };
}
