import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExecutorIncomingOrderNotificationTemplates1710000000016 implements MigrationInterface {
  name = "AddExecutorIncomingOrderNotificationTemplates1710000000016";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
          'executor_incoming_order',
          'push',
          'ru',
          'Новый заказ',
          '{{pickupAddress}} → {{destinationAddress}}. Стоимость: {{price}} {{currency}}.',
          true
        ),
        (
          'executor_incoming_order',
          'push',
          'kk',
          'Жаңа тапсырыс',
          '{{pickupAddress}} → {{destinationAddress}}. Құны: {{price}} {{currency}}.',
          true
        )
      ON CONFLICT ("type", "channel", "lang") DO UPDATE
      SET
        "subject" = EXCLUDED."subject",
        "body" = EXCLUDED."body",
        "is_active" = true,
        "updated_at" = NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "notification_templates"
      WHERE "type" = 'executor_incoming_order'
        AND "channel" = 'push'
        AND "lang" IN ('ru', 'kk')
    `);
  }
}
