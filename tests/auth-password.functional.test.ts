import { describe, expect } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";

import { AuthProvider } from "@/features/user/entities/UserAuth.js";



const validUser = {
	username: "test",
	password: "test",
	confirmPassword: "test"
};

const invalidUser = {
	username: "wrong-user",
	password: "wrong-pass",
	confirmPassword: "wrong-pass"
};

const newUser = {
	username: "new-user",
	password: "new-pass",
	confirmPassword: "new-pass"
};


describe('Password Auth API - Page', () => {
	test('POST Login Exists', async ({ app }) => {
		const res = await request(app)
			.post('/auth/login')
			.send(validUser);
		expect(res.status).not.equal(404);
	});
  
  
	test('POST Register Exists', async ({ app }) => {
		const res = await request(app)
			.post('/api/v1/auth/register')
			.send(newUser);
		expect(res.status).not.equal(404);
	});
});


describe('Password Auth API - Login/Register', () => {
  
	test.beforeEach(async ({ authService }) => {
		// Insert valid user to database
		await authService.register(
			validUser.username, 
			validUser.password, 
			validUser.confirmPassword
		);
	});
  
  
	test.afterEach(async ({ clearDatabaseRow }) => {
		await clearDatabaseRow();
	});
  
  
	test('POST Login with wrong username', async ({ app }) => {
		const res = await request(app)
			.post('/api/v1/auth/login')
			.send({
				username: invalidUser.username, 
				password: validUser.password
			});
		expect(res.status).toEqual(404);
	});
  
  
	test('POST Login with wrong password', async ({ app }) => {
		const res = await request(app)
			.post('/api/v1/auth/login')
			.send({
				username: validUser.username, 
				password: invalidUser.password
			});
		expect(res.status).toEqual(401);
	});
  
  
	test('POST Login with correct username and password', async ({ app }) => {
		const res = await request(app)
			.post('/api/v1/auth/login')
			.send(validUser);
		expect(res.status).toEqual(200);
	});
  
  
	test('POST Register with username that already exists', async ({ app }) => {
		const res = await request(app)
			.post('/api/v1/auth/register')
			.send(validUser);
		expect(res.status).equal(409);
	});
  
  
	test('POST Register with unmatched password', async ({ app }) => {
		const res = await request(app)
			.post('/api/v1/auth/register')
			.send({
				username: newUser.username, 
				password: newUser.password, 
				confirmPassword: invalidUser.confirmPassword
			});
		expect(res.status).equal(400);
	});
  
  
	test('POST Register with matched password', async ({ app }) => {
		const res = await request(app)
			.post('/api/v1/auth/register')
			.send(newUser);
		expect(res.status).equal(201);
		expect(res.body.data.providerUserId).equal(newUser.username);
		expect(res.body.data.provider).equal(AuthProvider.PASSWORD);
	});
});


describe('Password Auth API - Bind', () => {
	const newUserGoogle = {
		id: 0,
		uniqueId: '123456-google',
		displayIdentifier: 'test-express-tdd',
	};
  
	test.beforeEach(async ({ authService }) => {
		const gUserAuth = await authService.registerByGoogle(
			newUserGoogle.uniqueId, newUserGoogle.displayIdentifier);
		newUserGoogle.id = Number(gUserAuth.user!.id);
	});
  
  
	test.afterEach(async ({ clearDatabaseRow }) => {
		await clearDatabaseRow();
	});
  
  
	test('Bind password account', async ({ app, db }) => {
		const res = await request(app)
			.post('/api/v1/auth/password/bind')
			.send({...newUser, id: newUserGoogle.id});  // Register with account made from google
    
		const userAuth = await db.userAuth.findOne({
			providerUserId: newUser.username,
			provider: AuthProvider.PASSWORD,
		}, { populate: ['user'] });
    
		expect(userAuth?.user?.username).toBe(newUser.username);
		expect(res.status).equal(201);
	});
    
    
	test('Bind password account if exist', async ({ app, db, authService }) => {
    
		const userAuth = await authService.register(
			validUser.username,
			validUser.password,
			validUser.confirmPassword
		);
		const userId = Number(userAuth!.user!.id);
    
		const res = await request(app)
			.post('/api/v1/auth/password/bind')
			.send({...validUser, id: userId});

		const foundUserAuth = await db.userAuth.find({
			providerUserId: validUser.username,
			provider: AuthProvider.PASSWORD,
		});

		expect(foundUserAuth.length).toBeLessThan(2);
		expect(res.status).equal(409);
	});
});