import { MigrationInterface, QueryRunner } from "typeorm";

export class SupportContacts1710000000039 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE support_contacts (
      id uuid PRIMARY KEY,
      phone varchar(32) NOT NULL DEFAULT '',
      whatsapp varchar(32) NOT NULL DEFAULT '',
      email varchar(254) NOT NULL DEFAULT '',
      telegram varchar(200) NOT NULL DEFAULT ''
    )`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE support_contacts`);
  }
}
