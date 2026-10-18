import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018125055 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "store_colour" ("id" text not null, "name" text not null, "hex" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_colour_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_colour_deleted_at" ON "store_colour" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_colour" cascade;`);
  }

}
