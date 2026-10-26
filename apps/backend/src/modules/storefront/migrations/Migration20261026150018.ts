import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261026150018 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "storefront_contact" ("id" text not null, "email" text null, "phone" text null, "whatsapp" text null, "address" text null, "social_links" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "storefront_contact_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_contact_deleted_at" ON "storefront_contact" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "storefront_contact" cascade;`);
  }

}
