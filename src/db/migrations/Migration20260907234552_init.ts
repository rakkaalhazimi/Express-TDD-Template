import { Migration } from '@mikro-orm/migrations';

export class Migration20260907234552_init extends Migration {

  override name = 'Migration20260907234552_init';

  override up(): void | Promise<void> {
    this.addSql(`create table \`user\` (\`id\` integer not null primary key autoincrement, \`username\` text not null, \`password\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime null);`);
    this.addSql(`create unique index \`user_username_unique\` on \`user\` (\`username\`);`);

    this.addSql(`create table \`user_auth\` (\`id\` integer not null primary key autoincrement, \`user_id\` bigint null, \`provider\` text check (\`provider\` in ('google', 'github', 'discord', 'microsoft')) not null, \`provider_user_id\` text not null, \`display_identifier\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`user_auth_user_id_foreign\` foreign key (\`user_id\`) references \`user\` (\`id\`) on delete set null);`);
    this.addSql(`create index \`user_auth_user_id_index\` on \`user_auth\` (\`user_id\`);`);
    this.addSql(`create unique index \`user_auth_provider_provider_user_id_unique\` on \`user_auth\` (\`provider\`, \`provider_user_id\`);`);
  }

  override down(): void | Promise<void> {

    this.addSql(`drop table if exists \`user\`;`);
    this.addSql(`drop table if exists \`user_auth\`;`);
  }

}
