import { defineEntity, type InferEntity, p } from '@mikro-orm/core';
import { UserSchema } from './User.js';



export enum AuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
  DISCORD = 'discord',
};

export const UserAuthSchema = defineEntity({
  name: 'UserAuth',
  properties: {
    id: p.bigint().primary(),
    user: () => p.manyToOne(UserSchema),
    provider: p.enum(AuthProvider),
    providerUserId: p.string().unique(),
    
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

export type IUser = InferEntity<typeof UserAuthSchema>;