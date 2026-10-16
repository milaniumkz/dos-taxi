import { MigrationInterface, QueryRunner } from "typeorm";
export class PushCampaigns1710000000042 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE push_campaigns (
      id uuid PRIMARY KEY, title varchar(100) NOT NULL, body varchar(1000) NOT NULL,
      audience varchar(20) NOT NULL, actor_id uuid, status varchar(20) NOT NULL DEFAULT 'queued',
      queued_devices integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE push_campaigns`);
  }
}
