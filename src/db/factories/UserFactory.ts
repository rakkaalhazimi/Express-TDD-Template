import { Factory } from '@mikro-orm/seeder';

import { UserSchema, type IUser } from '@/features/user/entities/User.js';



export class UserFactory extends Factory<IUser> {
	model = UserSchema;

	definition(): Partial<IUser> {
		return {
			username: '',
			password: '',
		};
	}
}