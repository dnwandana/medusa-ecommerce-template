import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261017053056 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "bank_account" ("id" text not null, "bank_name" text not null, "account_number" text not null, "account_holder" text not null, "is_active" boolean not null default true, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "bank_account_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_bank_account_deleted_at" ON "bank_account" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_contact" ("id" text not null, "email" text null, "whatsapp" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_contact_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_contact_deleted_at" ON "store_contact" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "bank_account" cascade;`);

    this.addSql(`drop table if exists "store_contact" cascade;`);
  }

}
