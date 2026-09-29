import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillEvents1790800000000 implements MigrationInterface {
  name = 'AddBillEvents1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "bill_events" (` +
        `"id" uuid NOT NULL DEFAULT gen_random_uuid(), ` +
        `"bill_id" uuid NOT NULL, ` +
        `"actor_id" uuid, ` +
        `"type" character varying(30) NOT NULL, ` +
        `"chunk_index" integer, ` +
        `"amount_paise" integer, ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_bill_events_id" PRIMARY KEY ("id")` +
        `)`,
    );
    await queryRunner.query(`CREATE INDEX "idx_bill_events_bill_id_created_at" ON "bill_events" ("bill_id", "created_at")`);
    await queryRunner.query(
      `ALTER TABLE "bill_events" ADD CONSTRAINT "FK_bill_events_bill_id" ` +
        `FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill_events" ADD CONSTRAINT "FK_bill_events_actor_id" ` +
        `FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bill_events" DROP CONSTRAINT "FK_bill_events_actor_id"`);
    await queryRunner.query(`ALTER TABLE "bill_events" DROP CONSTRAINT "FK_bill_events_bill_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bill_events_bill_id_created_at"`);
    await queryRunner.query(`DROP TABLE "bill_events"`);
  }
}