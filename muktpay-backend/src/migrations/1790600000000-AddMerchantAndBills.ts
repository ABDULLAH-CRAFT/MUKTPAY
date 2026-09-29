import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMerchantAndBills1790600000000 implements MigrationInterface {
  name = 'AddMerchantAndBills1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "merchant_profiles" (` +
        `"id" uuid NOT NULL DEFAULT gen_random_uuid(), ` +
        `"user_id" uuid NOT NULL, ` +
        `"shop_name" character varying(50) NOT NULL, ` +
        `"vpa" character varying(100) NOT NULL, ` +
        `"verification" character varying(20) NOT NULL DEFAULT 'format', ` +
        `"issuer_label" character varying(120), ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_merchant_profiles_id" PRIMARY KEY ("id")` +
        `)`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_merchant_profiles_user_id" ON "merchant_profiles" ("user_id")`);
    await queryRunner.query(
      `ALTER TABLE "merchant_profiles" ADD CONSTRAINT "FK_merchant_profiles_user_id" ` +
        `FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "bills" (` +
        `"id" uuid NOT NULL DEFAULT gen_random_uuid(), ` +
        `"merchant_id" uuid NOT NULL, ` +
        `"ref" character varying(12) NOT NULL, ` +
        `"shop_name" character varying(50) NOT NULL, ` +
        `"vpa" character varying(100) NOT NULL, ` +
        `"total_paise" integer NOT NULL, ` +
        `"cap_paise" integer NOT NULL, ` +
        `"strategy" character varying(20) NOT NULL, ` +
        `"status" character varying(20) NOT NULL DEFAULT 'open', ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_bills_id" PRIMARY KEY ("id")` +
        `)`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_bills_ref" ON "bills" ("ref")`);
    await queryRunner.query(`CREATE INDEX "idx_bills_merchant_id" ON "bills" ("merchant_id")`);
    await queryRunner.query(
      `ALTER TABLE "bills" ADD CONSTRAINT "FK_bills_merchant_id" ` +
        `FOREIGN KEY ("merchant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "bill_chunks" (` +
        `"id" uuid NOT NULL DEFAULT gen_random_uuid(), ` +
        `"bill_id" uuid NOT NULL, ` +
        `"index" integer NOT NULL, ` +
        `"amount_paise" integer NOT NULL, ` +
        `"status" character varying(10) NOT NULL DEFAULT 'pending', ` +
        `"upi_url" text NOT NULL, ` +
        `"paid_at" TIMESTAMP WITH TIME ZONE, ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_bill_chunks_id" PRIMARY KEY ("id")` +
        `)`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_bill_chunks_bill_id_index" ON "bill_chunks" ("bill_id", "index")`);
    await queryRunner.query(
      `ALTER TABLE "bill_chunks" ADD CONSTRAINT "FK_bill_chunks_bill_id" ` +
        `FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bill_chunks" DROP CONSTRAINT "FK_bill_chunks_bill_id"`);
    await queryRunner.query(`DROP INDEX "public"."uq_bill_chunks_bill_id_index"`);
    await queryRunner.query(`DROP TABLE "bill_chunks"`);

    await queryRunner.query(`ALTER TABLE "bills" DROP CONSTRAINT "FK_bills_merchant_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bills_merchant_id"`);
    await queryRunner.query(`DROP INDEX "public"."uq_bills_ref"`);
    await queryRunner.query(`DROP TABLE "bills"`);

    await queryRunner.query(`ALTER TABLE "merchant_profiles" DROP CONSTRAINT "FK_merchant_profiles_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."uq_merchant_profiles_user_id"`);
    await queryRunner.query(`DROP TABLE "merchant_profiles"`);
  }
}
