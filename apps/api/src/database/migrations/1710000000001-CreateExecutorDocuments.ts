import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExecutorDocuments1710000000001
  implements MigrationInterface
{
  name = 'CreateExecutorDocuments1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "executor_documents" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "executor_id" UUID NOT NULL REFERENCES "executors"("id") ON DELETE CASCADE,
        "document_type" VARCHAR(50) NOT NULL,
        "file_name" VARCHAR(255) NOT NULL,
        "file_url" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "executor_documents"`);
  }
}
