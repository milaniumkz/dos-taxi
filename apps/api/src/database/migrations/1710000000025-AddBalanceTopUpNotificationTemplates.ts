import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBalanceTopUpNotificationTemplates1710000000025
  implements MigrationInterface
{
  name = "AddBalanceTopUpNotificationTemplates1710000000025";

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
        ('balance_topup_invoiced', 'push', 'ru', 'Счёт Kaspi выставлен', 'Счёт на пополнение {{amount}} ₸ выставлен. Оплатите его в Kaspi.', true),
        ('balance_topup_invoiced', 'sms', 'ru', null, 'Счёт Kaspi на пополнение {{amount}} ₸ выставлен. Оплатите его в Kaspi.', true),
        ('balance_topup_invoiced', 'push', 'kk', 'Kaspi шоты қойылды', '{{amount}} ₸ толықтыру шоты қойылды. Kaspi арқылы төлеңіз.', true),
        ('balance_topup_invoiced', 'sms', 'kk', null, '{{amount}} ₸ толықтыру үшін Kaspi шоты қойылды. Kaspi арқылы төлеңіз.', true),
        ('balance_topup_confirmed', 'push', 'ru', 'Баланс пополнен', 'Пополнение {{amount}} ₸ подтверждено. Баланс обновлён.', true),
        ('balance_topup_confirmed', 'sms', 'ru', null, 'Пополнение {{amount}} ₸ подтверждено. Баланс обновлён.', true),
        ('balance_topup_confirmed', 'push', 'kk', 'Баланс толықтырылды', '{{amount}} ₸ толықтыру расталды. Баланс жаңартылды.', true),
        ('balance_topup_confirmed', 'sms', 'kk', null, '{{amount}} ₸ толықтыру расталды. Баланс жаңартылды.', true),
        ('balance_topup_rejected', 'push', 'ru', 'Пополнение отклонено', 'Заявка на пополнение {{amount}} ₸ отклонена. {{comment}}', true),
        ('balance_topup_rejected', 'sms', 'ru', null, 'Заявка на пополнение {{amount}} ₸ отклонена. {{comment}}', true),
        ('balance_topup_rejected', 'push', 'kk', 'Толықтыру қабылданбады', '{{amount}} ₸ толықтыру өтінімі қабылданбады. {{comment}}', true),
        ('balance_topup_rejected', 'sms', 'kk', null, '{{amount}} ₸ толықтыру өтінімі қабылданбады. {{comment}}', true)
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
      WHERE "type" IN (
        'balance_topup_invoiced',
        'balance_topup_confirmed',
        'balance_topup_rejected'
      )
    `);
  }
}
