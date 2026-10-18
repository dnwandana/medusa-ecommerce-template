import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018153517 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "payment_note" ("id" text not null, "order_id" text not null, "note" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payment_note_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_note_order_id" ON "payment_note" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_note_deleted_at" ON "payment_note" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "payment_receipt" ("id" text not null, "order_id" text not null, "file_key" text not null, "file_name" text not null, "mime_type" text not null, "size" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payment_receipt_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_receipt_order_id" ON "payment_receipt" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_receipt_deleted_at" ON "payment_receipt" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payment_note" cascade;`);

    this.addSql(`drop table if exists "payment_receipt" cascade;`);
  }

}
