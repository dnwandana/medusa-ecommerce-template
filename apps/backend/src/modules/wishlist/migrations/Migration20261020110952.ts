import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261020110952 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "wishlist_item" add column if not exists "saved_unit_price" integer null, add column if not exists "available" boolean not null default true, add column if not exists "alerted_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "wishlist_item" drop column if exists "saved_unit_price", drop column if exists "available", drop column if exists "alerted_at";`);
  }

}
