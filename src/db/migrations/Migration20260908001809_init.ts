import { Migration } from '@mikro-orm/migrations';

export class Migration20260908001809_init extends Migration {

  override name = 'Migration20260908001809_init';

  override up(): void | Promise<void> {
    this.addSql(`create table "user" ("id" bigserial primary key, "username" varchar(100) not null, "password" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null);`);
    this.addSql(`alter table "user" add constraint "user_username_unique" unique ("username");`);

    this.addSql(`create table "user_auth" ("id" bigserial primary key, "user_id" bigint null, "provider" text not null, "provider_user_id" varchar(255) not null, "display_identifier" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "user_auth" add constraint "user_auth_provider_provider_user_id_unique" unique ("provider", "provider_user_id");`);

    this.addSql(`alter table "user_auth" add constraint "user_auth_user_id_foreign" foreign key ("user_id") references "user" ("id") on delete set null;`);
    this.addSql(`alter table "user_auth" add constraint "user_auth_provider_check" check ("provider" in ('google', 'github', 'discord', 'microsoft'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "user_auth" drop constraint "user_auth_user_id_foreign";`);

    this.addSql(`drop table if exists "user" cascade;`);
    this.addSql(`drop table if exists "user_auth" cascade;`);
  }

}
