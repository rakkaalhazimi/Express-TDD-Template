import { defineEntity, type InferEntity, p } from '@mikro-orm/core';


export const UserSchema = defineEntity({
	name: 'User',
	properties: {
		id: p.bigint().primary(),
		username: p.string().unique().length(100),
		password: p.string(),
    
		createdAt: p
			.datetime()
			.onCreate(() => new Date()),
      
		updatedAt: p
			.datetime()
			.onCreate(() => new Date())
			.onUpdate(() => new Date()),
      
		deletedAt: p.datetime().nullable()
	},
});

export type IUser = InferEntity<typeof UserSchema>;