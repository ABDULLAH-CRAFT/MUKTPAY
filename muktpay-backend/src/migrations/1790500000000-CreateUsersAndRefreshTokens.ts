import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline migration: the `users` and `refresh_tokens` tables.
 *
 * The later migrations all point foreign keys at "users", but nothing used to create it, so a
 * brand-new database (production!) failed on the first migration. This one runs first.
 *
 * It is idempotent (IF NOT EXISTS) so a development database that already has these tables
 * is left untouched.
 */
export class CreateUsersAndRefreshTokens1790500000000 implements MigrationInterface {
  name = 'CreateUsersAndRefreshTokens1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "users" (` +
        `"id" uuid NOT NULL DEFAULT gen_random_uuid(), ` +
        `"name" character varying(100) NOT NULL, ` +
        `"email" character varying(255) NOT NULL, ` +
        `"password_hash" character varying(100) NOT NULL, ` +
        `"is_active" boolean NOT NULL DEFAULT true, ` +
        `"last_login_at" TIMESTAMP WITH TIME ZONE, ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_users_id" PRIMARY KEY ("id")` +
        `)`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_email" ON "users" ("email")`);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "refresh_tokens" (` +
        `"id" uuid NOT NULL, ` +
        `"user_id" uuid NOT NULL, ` +
        `"token_hash" character(64) NOT NULL, ` +
        `"expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, ` +
        `"revoked_at" TIMESTAMP WITH TIME ZONE, ` +
        `"user_agent" character varying(255), ` +
        `"ip_address" character varying(64), ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"), ` +
        `CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") ` +
        `REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION` +
        `)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
