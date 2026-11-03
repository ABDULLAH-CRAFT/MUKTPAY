import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - users.email_verified_at: set once the person proves they own the mailbox.
 * - auth_codes: short-lived 6-digit codes for email verification and password reset.
 *   Only an HMAC of the code is stored, never the code itself.
 */
export class AddEmailVerificationAndAuthCodes1791200000000 implements MigrationInterface {
  name = 'AddEmailVerificationAndAuthCodes1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP WITH TIME ZONE`);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "auth_codes" (` +
        `"id" uuid NOT NULL DEFAULT gen_random_uuid(), ` +
        `"user_id" uuid NOT NULL, ` +
        `"purpose" character varying(30) NOT NULL, ` +
        `"code_hash" character(64) NOT NULL, ` +
        `"expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, ` +
        `"consumed_at" TIMESTAMP WITH TIME ZONE, ` +
        `"attempts" integer NOT NULL DEFAULT 0, ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_auth_codes_id" PRIMARY KEY ("id"), ` +
        `CONSTRAINT "FK_auth_codes_user_id" FOREIGN KEY ("user_id") ` +
        `REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION` +
        `)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_auth_codes_user_purpose" ON "auth_codes" ("user_id", "purpose")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_codes"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified_at"`);
  }
}
