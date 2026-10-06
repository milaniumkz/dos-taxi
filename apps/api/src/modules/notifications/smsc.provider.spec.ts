import { ConfigService } from "@nestjs/config";

import { NotificationsQueueService } from "./notifications-queue.service";
import { sendSmscSms } from "./smsc.provider";

function testConfig(values: Record<string, string> = {}): ConfigService {
  const config = new ConfigService(values);
  Object.defineProperty(config, "get", { value: (key: string) => values[key] });
  return config;
}

describe("SMSC.kz SMS provider", () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const config = testConfig({
    SMSC_LOGIN: "test login",
    SMSC_PASSWORD: "test-password",
  });

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, "fetch");
  });
  afterEach(() => jest.restoreAllMocks());

  it("posts UTF-8 SMS using credentials in the body and confirms acceptance", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 42, cnt: 1 })),
    );
    await expect(
      sendSmscSms(config, "+77010000000", "DOS кіру коды: 5829."),
    ).resolves.toEqual({ id: 42, cnt: 1 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://smsc.kz/sys/send.php");
    expect(options).toMatchObject({ method: "POST", redirect: "error" });
    const form = options?.body as URLSearchParams;
    expect(Object.fromEntries(form)).toEqual({
      login: "test login",
      psw: "test-password",
      phones: "77010000000",
      mes: "DOS кіру коды: 5829.",
      charset: "utf-8",
      fmt: "3",
    });
  });

  it("normalizes a domestic 8 prefix and sends the optional approved sender", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, cnt: 2 })),
    );
    await sendSmscSms(
      testConfig({
        SMSC_LOGIN: "test",
        SMSC_PASSWORD: "test",
        SMSC_SENDER: "DOS",
      }),
      "87010000000",
      "test",
    );
    const form = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(form.get("phones")).toBe("77010000000");
    expect(form.get("sender")).toBe("DOS");
  });

  it.each([2, 3, 6, 7, 8, 9])(
    "rejects API error %i even when HTTP status is 200",
    async (code) => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "test-password and private content",
            error_code: code,
          }),
        ),
      );
      await expect(sendSmscSms(config, "+77010000000", "test")).rejects.toThrow(
        `SMSC rejected the message (code ${code})`,
      );
    },
  );

  it.each([{}, { id: 1 }, { id: 0, cnt: 1 }, { id: 1, cnt: 0 }, null])(
    "rejects an unconfirmed response: %j",
    async (payload) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(payload)));
      await expect(sendSmscSms(config, "+77010000000", "test")).rejects.toThrow(
        /SMSC/,
      );
    },
  );

  it("sanitizes HTTP, JSON and transport failures without retrying", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("test-password", { status: 503 }),
    );
    await expect(sendSmscSms(config, "+77010000000", "test")).rejects.toThrow(
      "SMSC HTTP error 503",
    );
    fetchMock.mockResolvedValueOnce(new Response("test-password"));
    await expect(sendSmscSms(config, "+77010000000", "test")).rejects.toThrow(
      "SMSC returned an invalid JSON response",
    );
    fetchMock.mockRejectedValueOnce(new Error("test-password"));
    await expect(sendSmscSms(config, "+77010000000", "test")).rejects.toThrow(
      "SMSC request failed or timed out; acceptance is unknown",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("requires credentials and an international recipient before making requests", async () => {
    await expect(
      sendSmscSms(testConfig(), "+77010000000", "test"),
    ).rejects.toThrow("SMSC_LOGIN and SMSC_PASSWORD are required");
    await expect(
      sendSmscSms(config, "7010000000,77010000000", "test"),
    ).rejects.toThrow("SMSC recipient must be an international phone number");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not silently fall back to an unacknowledged in-memory OTP send", async () => {
    const queue = new NotificationsQueueService(
      testConfig({
        NOTIFICATIONS_SMS_PROVIDER: "smsc",
        NOTIFICATIONS_SMS_STUB: "false",
      }),
    );
    await expect(
      queue.enqueueSms({
        phone: "+77010000000",
        body: "test",
        subject: null,
        type: "auth_otp",
        lang: "ru",
      }),
    ).rejects.toThrow(
      "Redis notifications queue is required for SMSC delivery",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
