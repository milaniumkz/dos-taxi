import {
  BadRequestException,
  Body,
  Controller,
  Get,
  INestApplication,
  Post,
} from "@nestjs/common";
import { IsNotEmpty, IsString } from "class-validator";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { configureHttpApplication } from "../../src/shared/http/configure-http-app";
import { TRACE_ID_HEADER } from "../../src/shared/http/trace-id.constants";

class EchoDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

@Controller("debug")
class DebugController {
  @Get("ok")
  ok() {
    return { ok: true };
  }

  @Get("bad-request")
  badRequest() {
    throw new BadRequestException({
      code: "INVALID_INPUT",
      message: "Input is invalid",
      details: {
        field: "phone",
      },
    });
  }

  @Get("crash")
  crash() {
    throw new Error("boom");
  }

  @Post("echo")
  echo(@Body() dto: EchoDto) {
    return dto;
  }
}

describe("Runtime error envelope integration", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DebugController],
    }).compile();

    app = moduleRef.createNestApplication();
    configureHttpApplication(app, {
      apiPrefix: "api/v1",
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("adds a trace id header to successful responses", async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .get("/api/v1/debug/ok")
      .expect(200);

    expect(response.headers[TRACE_ID_HEADER]).toEqual(expect.any(String));
    expect(response.body).toEqual({ ok: true });
  });

  it("preserves inbound trace ids and returns normalized business errors", async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .get("/api/v1/debug/bad-request")
      .set(TRACE_ID_HEADER, "trace-123")
      .expect(400);

    expect(response.headers[TRACE_ID_HEADER]).toBe("trace-123");
    expect(response.body).toEqual({
      code: "INVALID_INPUT",
      message: "Input is invalid",
      details: {
        field: "phone",
      },
      traceId: "trace-123",
    });
  });

  it("normalizes validation errors into the common envelope", async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .post("/api/v1/debug/echo")
      .send({})
      .expect(400);

    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.message).toContain("проверьте");
    expect(response.body.details.errors).toEqual(expect.any(Array));
    expect(response.body.traceId).toEqual(expect.any(String));
  });

  it("normalizes unexpected exceptions into internal server errors", async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .get("/api/v1/debug/crash")
      .expect(500);

    expect(response.body).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("Сервер временно"),
      details: {},
      traceId: expect.any(String),
    });
  });
});
