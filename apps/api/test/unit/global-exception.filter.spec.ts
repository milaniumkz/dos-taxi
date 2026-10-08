import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  Logger,
} from "@nestjs/common";
import { GlobalExceptionFilter } from "../../src/shared/filters/global-exception.filter";

function respond(error: unknown, language = "ru") {
  const response = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({
        method: "POST",
        url: "/api/v1/orders",
        traceId: "trace-test",
        headers: { "accept-language": language },
      }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(error, host);
  return response;
}

describe("server messages for installed clients", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("keeps the error contract while explaining unavailable tariffs", () => {
    const response = respond(
      new HttpException(
        {
          code: "TARIFF_NOT_FOUND",
          message: "No active tariff found",
          details: { cityId: "city-1" },
        },
        404,
      ),
    );
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "TARIFF_NOT_FOUND",
        message: expect.stringContaining("Выберите другой тариф"),
        details: { cityId: "city-1" },
        traceId: "trace-test",
      }),
    );
  });
  it("retains validation details for older clients and support", () => {
    const errors = ["distanceMeters must not be less than 1"];
    const response = respond(new BadRequestException(errors));
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        message: expect.stringContaining("проверьте"),
        details: { errors },
      }),
    );
  });
  it("uses the requested Kazakh language", () => {
    const response = respond(
      new HttpException(
        { code: "PROMO_CODE_EXPIRED", message: "PROMO_CODE_EXPIRED" },
        400,
      ),
      "kk-KZ,ru;q=0.5",
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "PROMO_CODE_EXPIRED",
        message: expect.stringContaining("мерзімі аяқталды"),
      }),
    );
  });
  it("does not expose an unexpected internal exception", () => {
    const response = respond(new Error("private database failure"));
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "INTERNAL_SERVER_ERROR",
        message: expect.stringContaining("Сервер временно"),
      }),
    );
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      "private database failure",
    );
  });
});
