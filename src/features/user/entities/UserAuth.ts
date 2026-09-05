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
    providerUserId: p.string(),
    displayIdentifier: p.string(),
    
    createdAt: p
      .datetime()
      .onCreate(() => new Date()),
      
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
  uniques: [
    { properties: ['provider', 'providerUserId'] },
  ]
});

export type IUserAuth = InferEntity<typeof UserAuthSchema>;