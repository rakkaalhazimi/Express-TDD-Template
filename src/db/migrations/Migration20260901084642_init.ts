import { Migration } from '@mikro-orm/migrations';

export class Migration20260901084642_init extends Migration {

  override name = 'Migration20260901084642_init';

  override up(): void | Promise<void> {
    this.addSql(`create table \`user\` (\`id\` integer not null primary key autoincrement, \`username\` text not null, \`password\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime null);`);
    this.addSql(`create unique index \`user_username_unique\` on \`user\` (\`username\`);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`user\`;`);
  }

}
