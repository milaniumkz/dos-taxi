import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthOtpNotificationTemplates1710000000015 implements MigrationInterface {
  name = "AddAuthOtpNotificationTemplates1710000000015";

  public async up(queryRunner: QueryRunner): Promise<void> {
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
        VALUES
          (
            'auth_otp',
            'sms',
            'ru',
            NULL,
            'Код входа DOS: {{code}}. Никому его не сообщайте.',
            true
          ),
          (
            'auth_otp',
            'sms',
            'kk',
            NULL,
            'DOS кіру коды: {{code}}. Оны ешкімге айтпаңыз.',
            true
          )
        ON CONFLICT ("type", "channel", "lang") DO UPDATE
        SET
          "subject" = EXCLUDED."subject",
          "body" = EXCLUDED."body",
          "is_active" = true,
          "updated_at" = NOW()
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        DELETE FROM "notification_templates"
        WHERE "type" = 'auth_otp'
          AND "channel" = 'sms'
          AND "lang" IN ('ru', 'kk')
      `,
    );
  }
}
