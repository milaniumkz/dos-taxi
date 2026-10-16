import { randomUUID } from "node:crypto";
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { DataSource } from "typeorm";
import { databaseEntities } from "../../src/database/entities";
import { SupportContacts1710000000039 } from "../../src/database/migrations/1710000000039-SupportContacts";
import { AdminActivityLogEntity } from "../../src/modules/admin/entities/admin-activity-log.entity";
import { JwtAuthGuard } from "../../src/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/modules/auth/guards/roles.guard";
import { AdminSupportContactsController } from "../../src/modules/support/admin-support-contacts.controller";
import { SupportContactsEntity } from "../../src/modules/support/entities/support-contacts.entity";
import { SupportContactsService } from "../../src/modules/support/support-contacts.service";
import { SupportController } from "../../src/modules/support/support.controller";
import { SupportService } from "../../src/modules/support/support.service";
import { UserEntity } from "../../src/modules/users/entities/user.entity";
import { configureHttpApplication } from "../../src/shared/http/configure-http-app";

describe("editable support contacts", () => {
  const schema = `support_contacts_test_${randomUUID().replaceAll("-", "")}`;
  const adminId = randomUUID();
  const empty = { phone: "", whatsapp: "", email: "", telegram: "" };
  const contacts = {
    phone: "+77001234567",
    whatsapp: "+77007654321",
    email: "help@example.com",
    telegram: "https://t.me/dos_support",
  };
  let db: DataSource;
  let app: INestApplication;
  const endpoint = "/api/v1/admin/settings/support-contacts";

  beforeAll(async () => {
    const url =
      process.env.PROMO_TEST_DATABASE_URL ??
      "postgresql://platform:platform@localhost:5432/platform_test";
    if (!new URL(url).pathname.endsWith("_test"))
      throw new Error("Use an isolated _test database");
    db = new DataSource({
      type: "postgres",
      url,
      schema,
      entities: databaseEntities,
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    await db.query("DROP TABLE support_contacts");
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await new SupportContacts1710000000039().up(runner);
    } finally {
      await runner.release();
    }
    await db
      .getRepository(UserEntity)
      .save({ id: adminId, phone: "+77000000199" });
    const module = await Test.createTestingModule({
      controllers: [AdminSupportContactsController, SupportController],
      providers: [
        SupportContactsService,
        RolesGuard,
        {
          provide: getRepositoryToken(SupportContactsEntity),
          useValue: db.getRepository(SupportContactsEntity),
        },
        { provide: SupportService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          if (!req.headers["x-role"]) throw new UnauthorizedException();
          req.user = { sub: adminId, role: req.headers["x-role"] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  it("starts empty without exposing a fictional support number", async () => {
    await request(app.getHttpServer())
      .get(endpoint)
      .set("x-role", "admin")
      .expect(200, empty);
  });

  it("persists administrator changes and exposes identical contacts to passengers and drivers", async () => {
    await request(app.getHttpServer())
      .patch(endpoint)
      .set("x-role", "admin")
      .send({ ...contacts, phone: ` ${contacts.phone} ` })
      .expect(200, contacts);
    for (const role of ["client", "executor"]) {
      await request(app.getHttpServer())
        .get("/api/v1/support/contacts")
        .set("x-role", role)
        .expect(200, contacts);
    }
    expect(
      await new SupportContactsService(
        db.getRepository(SupportContactsEntity),
      ).get(),
    ).toEqual(contacts);
    const logs = await db
      .getRepository(AdminActivityLogEntity)
      .findBy({ action: "support.contacts.updated" });
    expect(logs).toHaveLength(1);
    expect(logs[0].actorId).toBe(adminId);
  });

  it.each(["client", "executor", "support", "operator"])(
    "rejects writes from %s",
    async (role) => {
      await request(app.getHttpServer())
        .patch(endpoint)
        .set("x-role", role)
        .send(empty)
        .expect(403);
    },
  );

  it("requires authentication", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/support/contacts")
      .expect(401);
  });

  it.each([
    { phone: "not a phone" },
    { whatsapp: "javascript:alert(1)" },
    { email: "broken email" },
    { email: null },
    { telegram: "https://evil.example.com" },
    { telegram: "javascript:alert(1)" },
    { extra: "unexpected" },
  ])(
    "rejects invalid contacts without overwriting saved data: %j",
    async (invalid) => {
      await request(app.getHttpServer())
        .patch(endpoint)
        .set("x-role", "admin")
        .send({ ...contacts, ...invalid })
        .expect(400);
      expect(
        await new SupportContactsService(
          db.getRepository(SupportContactsEntity),
        ).get(),
      ).toEqual(contacts);
    },
  );

  it("allows clearing contacts and keeps a single settings row", async () => {
    await request(app.getHttpServer())
      .patch(endpoint)
      .set("x-role", "admin")
      .send(empty)
      .expect(200, empty);
    expect(await db.getRepository(SupportContactsEntity).count()).toBe(1);
    await request(app.getHttpServer())
      .get("/api/v1/support/contacts")
      .set("x-role", "client")
      .expect(200, empty);
  });
});
