import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018130012 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "magic_link_request" ("id" text not null, "email" text not null, "token_hash" text not null, "secret_hash" text not null, "locale" text not null, "browser" text not null, "expires_at" timestamptz not null, "confirmed_at" timestamptz null, "consumed_at" timestamptz null, "invalidated_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "magic_link_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_magic_link_request_email" ON "magic_link_request" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_magic_link_request_deleted_at" ON "magic_link_request" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "magic_link_request" cascade;`);
  }

}
