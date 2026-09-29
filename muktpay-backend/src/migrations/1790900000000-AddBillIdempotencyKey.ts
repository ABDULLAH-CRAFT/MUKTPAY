import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillIdempotencyKey1790900000000 implements MigrationInterface {
  name = 'AddBillIdempotencyKey1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bills" ADD "idempotency_key" character varying(64)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_bills_merchant_idempotency_key" ON "bills" ("merchant_id", "idempotency_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_bills_merchant_idempotency_key"`);
    await queryRunner.query(`ALTER TABLE "bills" DROP COLUMN "idempotency_key"`);
  }
}