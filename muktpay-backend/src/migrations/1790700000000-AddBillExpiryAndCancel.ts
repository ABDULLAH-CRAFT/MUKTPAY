import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillExpiryAndCancel1790700000000 implements MigrationInterface {
  name = 'AddBillExpiryAndCancel1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bills" ADD "expires_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "bills" ADD "cancelled_at" TIMESTAMP WITH TIME ZONE`);
    // Bills that already exist get the same 24h window, counted from when they were created.
    await queryRunner.query(`UPDATE "bills" SET "expires_at" = "created_at" + interval '24 hours'`);
    await queryRunner.query(`ALTER TABLE "bills" ALTER COLUMN "expires_at" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bills" DROP COLUMN "cancelled_at"`);
    await queryRunner.query(`ALTER TABLE "bills" DROP COLUMN "expires_at"`);
  }
}