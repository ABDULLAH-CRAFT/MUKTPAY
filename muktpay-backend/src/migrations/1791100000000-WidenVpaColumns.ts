import { MigrationInterface, QueryRunner } from 'typeorm';

export class WidenVpaColumns1791100000000 implements MigrationInterface {
  name = 'WidenVpaColumns1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Widening a varchar is a metadata-only change in PostgreSQL: no table rewrite, no long lock.
    await queryRunner.query(`ALTER TABLE "merchant_profiles" ALTER COLUMN "vpa" TYPE character varying(322)`);
    await queryRunner.query(`ALTER TABLE "bills" ALTER COLUMN "vpa" TYPE character varying(322)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ too_long }] = await queryRunner.query(
      `SELECT (EXISTS (SELECT 1 FROM "merchant_profiles" WHERE length("vpa") > 100)
            OR EXISTS (SELECT 1 FROM "bills" WHERE length("vpa") > 100)) AS too_long`,
    );
    if (too_long) {
      throw new Error('Cannot revert: some UPI IDs are longer than 100 characters and would be truncated.');
    }
    await queryRunner.query(`ALTER TABLE "bills" ALTER COLUMN "vpa" TYPE character varying(100)`);
    await queryRunner.query(`ALTER TABLE "merchant_profiles" ALTER COLUMN "vpa" TYPE character varying(100)`);
  }
}