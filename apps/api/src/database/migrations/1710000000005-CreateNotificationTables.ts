import { MigrationInterface, QueryRunner } from "typeorm";

type NotificationTemplateSeed = {
  type: string;
  channel: "push" | "sms";
  lang: "ru" | "kk";
  subject: string | null;
  body: string;
};

export class CreateNotificationTables1710000000005 implements MigrationInterface {
  name = "CreateNotificationTables1710000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notification_templates" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" VARCHAR(50) NOT NULL,
        "channel" VARCHAR(20) NOT NULL,
        "lang" VARCHAR(5) NOT NULL,
        "subject" VARCHAR(255),
        "body" TEXT NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_notification_templates_type_channel_lang"
      ON "notification_templates" ("type", "channel", "lang")
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_device_tokens" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" VARCHAR(512) NOT NULL,
        "platform" VARCHAR(20) NOT NULL DEFAULT 'unknown',
        "role" VARCHAR(20),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_device_tokens_user_id"
      ON "notification_device_tokens" ("user_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_notification_device_tokens_token"
      ON "notification_device_tokens" ("token")
    `);

    for (const template of this.getTemplates()) {
      await queryRunner.query(
        `
          INSERT INTO "notification_templates" (
            "type",
            "channel",
            "lang",
            "subject",
            "body",
            "is_active"
          )
          VALUES ($1, $2, $3, $4, $5, true)
        `,
        [
          template.type,
          template.channel,
          template.lang,
          template.subject,
          template.body,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_device_tokens_token"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_device_tokens_user_id"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "notification_device_tokens"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_templates_type_channel_lang"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates"`);
  }

  private getTemplates(): NotificationTemplateSeed[] {
    return [
      {
        type: "auth_otp",
        channel: "sms",
        lang: "ru",
        subject: null,
        body: "Код входа DOS: {{code}}. Никому его не сообщайте.",
      },
      {
        type: "auth_otp",
        channel: "sms",
        lang: "kk",
        subject: null,
        body: "DOS кіру коды: {{code}}. Оны ешкімге айтпаңыз.",
      },
      {
        type: "order_accepted",
        channel: "push",
        lang: "ru",
        subject: "Заказ принят",
        body: "Заказ №{{orderId}} принят.",
      },
      {
        type: "order_accepted",
        channel: "sms",
        lang: "ru",
        subject: null,
        body: "Заказ №{{orderId}} принят.",
      },
      {
        type: "order_accepted",
        channel: "push",
        lang: "kk",
        subject: "Тапсырыс қабылданды",
        body: "№{{orderId}} тапсырысы қабылданды.",
      },
      {
        type: "order_accepted",
        channel: "sms",
        lang: "kk",
        subject: null,
        body: "№{{orderId}} тапсырысы қабылданды.",
      },
      {
        type: "order_arriving",
        channel: "push",
        lang: "ru",
        subject: "Исполнитель в пути",
        body: "Исполнитель едет к вам по заказу №{{orderId}}.",
      },
      {
        type: "order_arriving",
        channel: "sms",
        lang: "ru",
        subject: null,
        body: "Исполнитель едет к вам по заказу №{{orderId}}.",
      },
      {
        type: "order_arriving",
        channel: "push",
        lang: "kk",
        subject: "Орындаушы жолда",
        body: "Орындаушы №{{orderId}} тапсырысы бойынша сізге келе жатыр.",
      },
      {
        type: "order_arriving",
        channel: "sms",
        lang: "kk",
        subject: null,
        body: "Орындаушы №{{orderId}} тапсырысы бойынша сізге келе жатыр.",
      },
      {
        type: "order_started",
        channel: "push",
        lang: "ru",
        subject: "Поездка началась",
        body: "Заказ №{{orderId}} начат.",
      },
      {
        type: "order_started",
        channel: "sms",
        lang: "ru",
        subject: null,
        body: "Заказ №{{orderId}} начат.",
      },
      {
        type: "order_started",
        channel: "push",
        lang: "kk",
        subject: "Сапар басталды",
        body: "№{{orderId}} тапсырысы басталды.",
      },
      {
        type: "order_started",
        channel: "sms",
        lang: "kk",
        subject: null,
        body: "№{{orderId}} тапсырысы басталды.",
      },
      {
        type: "order_completed",
        channel: "push",
        lang: "ru",
        subject: "Заказ завершён",
        body: "Заказ №{{orderId}} завершён.",
      },
      {
        type: "order_completed",
        channel: "sms",
        lang: "ru",
        subject: null,
        body: "Заказ №{{orderId}} завершён.",
      },
      {
        type: "order_completed",
        channel: "push",
        lang: "kk",
        subject: "Тапсырыс аяқталды",
        body: "№{{orderId}} тапсырысы аяқталды.",
      },
      {
        type: "order_completed",
        channel: "sms",
        lang: "kk",
        subject: null,
        body: "№{{orderId}} тапсырысы аяқталды.",
      },
      {
        type: "order_cancelled",
        channel: "push",
        lang: "ru",
        subject: "Заказ отменён",
        body: "Заказ №{{orderId}} отменён{{reasonSuffix}}.",
      },
      {
        type: "order_cancelled",
        channel: "sms",
        lang: "ru",
        subject: null,
        body: "Заказ №{{orderId}} отменён{{reasonSuffix}}.",
      },
      {
        type: "order_cancelled",
        channel: "push",
        lang: "kk",
        subject: "Тапсырыс тоқтатылды",
        body: "№{{orderId}} тапсырысы тоқтатылды{{reasonSuffix}}.",
      },
      {
        type: "order_cancelled",
        channel: "sms",
        lang: "kk",
        subject: null,
        body: "№{{orderId}} тапсырысы тоқтатылды{{reasonSuffix}}.",
      },
      {
        type: "delivery_picked_up",
        channel: "push",
        lang: "ru",
        subject: "Посылка забрана",
        body: "Доставка №{{orderId}} забрана{{recipientSuffix}}.",
      },
      {
        type: "delivery_picked_up",
        channel: "sms",
        lang: "ru",
        subject: null,
        body: "Доставка №{{orderId}} забрана{{recipientSuffix}}.",
      },
      {
        type: "delivery_picked_up",
        channel: "push",
        lang: "kk",
        subject: "Сәлемдеме алынды",
        body: "№{{orderId}} жеткізілімі алынды{{recipientSuffix}}.",
      },
      {
        type: "delivery_picked_up",
        channel: "sms",
        lang: "kk",
        subject: null,
        body: "№{{orderId}} жеткізілімі алынды{{recipientSuffix}}.",
      },
      {
        type: "delivery_at_door",
        channel: "push",
        lang: "ru",
        subject: "Курьер у двери",
        body: "Курьер по доставке №{{orderId}} у двери{{recipientSuffix}}.",
      },
      {
        type: "delivery_at_door",
        channel: "sms",
        lang: "ru",
        subject: null,
        body: "Курьер по доставке №{{orderId}} у двери{{recipientSuffix}}.",
      },
      {
        type: "delivery_at_door",
        channel: "push",
        lang: "kk",
        subject: "Курьер есік алдында",
        body: "№{{orderId}} жеткізілімі бойынша курьер есік алдында{{recipientSuffix}}.",
      },
      {
        type: "delivery_at_door",
        channel: "sms",
        lang: "kk",
        subject: null,
        body: "№{{orderId}} жеткізілімі бойынша курьер есік алдында{{recipientSuffix}}.",
      },
      {
        type: "delivery_completed",
        channel: "push",
        lang: "ru",
        subject: "Доставка завершена",
        body: "Доставка №{{orderId}} вручена{{recipientSuffix}}.",
      },
      {
        type: "delivery_completed",
        channel: "sms",
        lang: "ru",
        subject: null,
        body: "Доставка №{{orderId}} вручена{{recipientSuffix}}.",
      },
      {
        type: "delivery_completed",
        channel: "push",
        lang: "kk",
        subject: "Жеткізу аяқталды",
        body: "№{{orderId}} жеткізілімі табысталды{{recipientSuffix}}.",
      },
      {
        type: "delivery_completed",
        channel: "sms",
        lang: "kk",
        subject: null,
        body: "№{{orderId}} жеткізілімі табысталды{{recipientSuffix}}.",
      },
      {
        type: "delivery_failed",
        channel: "push",
        lang: "ru",
        subject: "Доставка не выполнена",
        body: "Доставка №{{orderId}} не вручена{{reasonSuffix}}.",
      },
      {
        type: "delivery_failed",
        channel: "sms",
        lang: "ru",
        subject: null,
        body: "Доставка №{{orderId}} не вручена{{reasonSuffix}}.",
      },
      {
        type: "delivery_failed",
        channel: "push",
        lang: "kk",
        subject: "Жеткізу сәтсіз аяқталды",
        body: "№{{orderId}} жеткізілімі сәтсіз аяқталды{{reasonSuffix}}.",
      },
      {
        type: "delivery_failed",
        channel: "sms",
        lang: "kk",
        subject: null,
        body: "№{{orderId}} жеткізілімі сәтсіз аяқталды{{reasonSuffix}}.",
      },
    ];
  }
}
