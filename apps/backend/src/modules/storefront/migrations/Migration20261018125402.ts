import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018125402 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "home_campaign" drop constraint if exists "home_campaign_status_unique";`);
    this.addSql(`create table if not exists "home_campaign" ("id" text not null, "name" text not null, "image_url" text not null, "mobile_image_url" text null, "eyebrow_en" text null, "eyebrow_id" text null, "title_en" text not null, "title_id" text not null, "text_en" text null, "text_id" text null, "button_label_en" text not null, "button_label_id" text not null, "link_type" text check ("link_type" in ('category', 'all_products', 'path')) not null, "link_category_id" text null, "link_path" text null, "status" text check ("status" in ('draft', 'live', 'ended')) not null default 'draft', "went_live_at" timestamptz null, "ended_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "home_campaign_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_home_campaign_deleted_at" ON "home_campaign" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_home_campaign_status_unique" ON "home_campaign" ("status") WHERE status = 'live' AND deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "home_campaign" cascade;`);
  }

}
