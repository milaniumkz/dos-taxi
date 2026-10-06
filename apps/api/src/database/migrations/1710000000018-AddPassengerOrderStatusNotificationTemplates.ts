import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPassengerOrderStatusNotificationTemplates1710000000018
  implements MigrationInterface
{
  name = "AddPassengerOrderStatusNotificationTemplates1710000000018";

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
        ('order_accepted', 'push', 'ru', 'Водитель назначен', 'Водитель назначен и едет к вам.', true),
        ('order_accepted', 'sms', 'ru', null, 'Водитель назначен и едет к вам.', true),
        ('order_accepted', 'push', 'kk', 'Жүргізуші тағайындалды', 'Жүргізуші тағайындалды және сізге келе жатыр.', true),
        ('order_accepted', 'sms', 'kk', null, 'Жүргізуші тағайындалды және сізге келе жатыр.', true),
        ('order_arriving', 'push', 'ru', 'Водитель в пути', 'Водитель едет к точке подачи.', true),
        ('order_arriving', 'sms', 'ru', null, 'Водитель едет к точке подачи.', true),
        ('order_arriving', 'push', 'kk', 'Жүргізуші жолда', 'Жүргізуші отырғызу нүктесіне келе жатыр.', true),
        ('order_arriving', 'sms', 'kk', null, 'Жүргізуші отырғызу нүктесіне келе жатыр.', true),
        ('order_waiting', 'push', 'ru', 'Водитель приехал', 'Водитель ожидает вас в точке подачи.', true),
        ('order_waiting', 'sms', 'ru', null, 'Водитель ожидает вас в точке подачи.', true),
        ('order_waiting', 'push', 'kk', 'Жүргізуші келді', 'Жүргізуші отырғызу нүктесінде күтіп тұр.', true),
        ('order_waiting', 'sms', 'kk', null, 'Жүргізуші отырғызу нүктесінде күтіп тұр.', true),
        ('order_started', 'push', 'ru', 'Поездка началась', 'Поездка началась. Стоимость будет рассчитана по таксометру.', true),
        ('order_started', 'sms', 'ru', null, 'Поездка началась.', true),
        ('order_started', 'push', 'kk', 'Сапар басталды', 'Сапар басталды. Құны таксометр бойынша есептеледі.', true),
        ('order_started', 'sms', 'kk', null, 'Сапар басталды.', true),
        ('order_completed', 'push', 'ru', 'Поездка завершена', 'Поездка завершена. Оцените поездку в приложении.', true),
        ('order_completed', 'sms', 'ru', null, 'Поездка завершена.', true),
        ('order_completed', 'push', 'kk', 'Сапар аяқталды', 'Сапар аяқталды. Қолданбада сапарды бағалаңыз.', true),
        ('order_completed', 'sms', 'kk', null, 'Сапар аяқталды.', true)
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
      WHERE "type" = 'order_waiting'
    `);

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
        ('order_accepted', 'push', 'ru', 'Заказ принят', 'Заказ №{{orderId}} принят.', true),
        ('order_accepted', 'sms', 'ru', null, 'Заказ №{{orderId}} принят.', true),
        ('order_accepted', 'push', 'kk', 'Тапсырыс қабылданды', '№{{orderId}} тапсырысы қабылданды.', true),
        ('order_accepted', 'sms', 'kk', null, '№{{orderId}} тапсырысы қабылданды.', true),
        ('order_arriving', 'push', 'ru', 'Исполнитель в пути', 'Исполнитель едет к вам по заказу №{{orderId}}.', true),
        ('order_arriving', 'sms', 'ru', null, 'Исполнитель едет к вам по заказу №{{orderId}}.', true),
        ('order_arriving', 'push', 'kk', 'Орындаушы жолда', 'Орындаушы №{{orderId}} тапсырысы бойынша сізге келе жатыр.', true),
        ('order_arriving', 'sms', 'kk', null, 'Орындаушы №{{orderId}} тапсырысы бойынша сізге келе жатыр.', true),
        ('order_started', 'push', 'ru', 'Поездка началась', 'Заказ №{{orderId}} начат.', true),
        ('order_started', 'sms', 'ru', null, 'Заказ №{{orderId}} начат.', true),
        ('order_started', 'push', 'kk', 'Сапар басталды', '№{{orderId}} тапсырысы басталды.', true),
        ('order_started', 'sms', 'kk', null, '№{{orderId}} тапсырысы басталды.', true),
        ('order_completed', 'push', 'ru', 'Заказ завершён', 'Заказ №{{orderId}} завершён.', true),
        ('order_completed', 'sms', 'ru', null, 'Заказ №{{orderId}} завершён.', true),
        ('order_completed', 'push', 'kk', 'Тапсырыс аяқталды', '№{{orderId}} тапсырысы аяқталды.', true),
        ('order_completed', 'sms', 'kk', null, '№{{orderId}} тапсырысы аяқталды.', true)
      ON CONFLICT ("type", "channel", "lang") DO UPDATE
      SET
        "subject" = EXCLUDED."subject",
        "body" = EXCLUDED."body",
        "is_active" = true,
        "updated_at" = NOW()
    `);
  }
}
