import { Migration } from '@mikro-orm/migrations';

export class Migration20260908104710_pwd_auth extends Migration {

  override name = 'Migration20260908104710_pwd_auth';

  override up(): void | Promise<void> {
    this.addSql(`alter table "user_auth" drop constraint "user_auth_provider_check";`);
    this.addSql(`alter table "user_auth" add constraint "user_auth_provider_check" check ("provider" in ('password', 'google', 'github', 'discord', 'microsoft'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "user_auth" drop constraint "user_auth_provider_check";`);
    this.addSql(`alter table "user_auth" add constraint "user_auth_provider_check" check ("provider" in ('google', 'github', 'discord', 'microsoft'));`);
  }

}
