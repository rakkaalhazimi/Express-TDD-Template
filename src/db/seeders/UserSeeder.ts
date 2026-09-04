import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { UserFactory } from '@/db/factories/UserFactory.js';



export class UserSeeder extends Seeder {

  async run(em: EntityManager): Promise<void> {
    new UserFactory(em).make(10);
  }

}
