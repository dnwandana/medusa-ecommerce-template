import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261002160311 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "review" drop constraint if exists "review_order_line_item_id_unique";`);
    this.addSql(`create table if not exists "review" ("id" text not null, "product_id" text not null, "customer_id" text not null, "order_line_item_id" text not null, "rating" integer not null, "title" text null, "content" text not null, "first_name" text not null, "last_name" text not null, "status" text check ("status" in ('pending', 'approved', 'rejected')) not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_pkey" primary key ("id"), constraint rating_range check (rating >= 1 AND rating <= 5));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_REVIEW_PRODUCT_ID" ON "review" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" ON "review" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_order_line_item_id_unique" ON "review" ("order_line_item_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review" cascade;`);
  }

}
