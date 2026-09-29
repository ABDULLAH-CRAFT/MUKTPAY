import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillNote1791000000000 implements MigrationInterface {
  name = 'AddBillNote1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bills" ADD "note" character varying(60)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bills" DROP COLUMN "note"`);
  }
}