import { Migration } from '@mikro-orm/migrations';

export class Migration20260905110708_user_auth extends Migration {

  override name = 'Migration20260905110708_user_auth';

  override up(): void | Promise<void> {
    this.addSql(`create table \`user_auth\` (\`id\` integer not null primary key autoincrement, \`user_id\` bigint not null, \`provider\` text check (\`provider\` in ('google', 'github', 'discord')) not null, \`provider_user_id\` text not null, \`display_identifier\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`user_auth_user_id_foreign\` foreign key (\`user_id\`) references \`user\` (\`id\`));`);
    this.addSql(`create index \`user_auth_user_id_index\` on \`user_auth\` (\`user_id\`);`);
    this.addSql(`create unique index \`user_auth_provider_provider_user_id_unique\` on \`user_auth\` (\`provider\`, \`provider_user_id\`);`);

    this.addSql(`pragma foreign_keys = off;`);
    this.addSql(`create table \`user__temp_alter\` (\`id\` integer not null primary key autoincrement, \`username\` text not null, \`password\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime null);`);
    this.addSql(`insert into \`user__temp_alter\` select \`id\`, \`username\`, \`password\`, \`created_at\`, \`updated_at\`, \`deleted_at\` from \`user\`;`);
    this.addSql(`drop table \`user\`;`);
    this.addSql(`alter table \`user__temp_alter\` rename to \`user\`;`);
    this.addSql(`create unique index \`user_username_unique\` on \`user\` (\`username\`);`);
    this.addSql(`pragma foreign_keys = on;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`user_auth\`;`);

    this.addSql(`pragma foreign_keys = off;`);
    this.addSql(`create table \`user__temp_alter\` (\`id\` integer not null primary key autoincrement, \`username\` TEXT not null, \`password\` TEXT not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime null);`);
    this.addSql(`insert into \`user__temp_alter\` select \`id\`, \`username\`, \`password\`, \`created_at\`, \`updated_at\`, \`deleted_at\` from \`user\`;`);
    this.addSql(`drop table \`user\`;`);
    this.addSql(`alter table \`user__temp_alter\` rename to \`user\`;`);
    this.addSql(`create unique index \`user_username_unique\` on \`user\` (\`username\`);`);
    this.addSql(`pragma foreign_keys = on;`);
  }

}
