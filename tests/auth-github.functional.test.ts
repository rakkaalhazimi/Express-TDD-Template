import { describe, expect, vi, beforeAll } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";

import { AuthService } from "@/features/auth/auth.service.js";
import { AuthProvider } from "@/features/user/entities/UserAuth.js";



const githubLoginPayload = {
	id: '123456789',
	login: 'expressjstdd',
};


describe('Github Auth API - Page', () => {

	test('GET github auth exists', async ({ app }) => {
		const res = await request(app)
			.get('/api/v1/auth/github')
			.redirects(0);
		expect(res.status).equal(302);
	});


	test('GET github auth callback exists', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/github/callback');
		expect(res.status).not.equal(404);
	});


	test('GET github bind exists', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/github-bind');
		expect(res.status).not.equal(404);
	});


	test('GET github bind callback exists', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/github/bind');
		expect(res.status).not.equal(404);
	});
});



describe('Github Auth API - Register', () => {

	beforeAll(() => {
		vi.spyOn(AuthService.prototype, 'authorizeGithub')
			.mockResolvedValue(githubLoginPayload);
	});


	test.afterEach(async ({ clearDatabaseRow }) => {
		await clearDatabaseRow();
	});


	test('Register new user by Github', async ({ app, db }) => {
		await request(app).get('/api/v1/auth/github/callback');
		const newAuthUser = await db.userAuth.findOne({
			providerUserId: githubLoginPayload.id,
			displayIdentifier: githubLoginPayload.login,
		});
		expect(newAuthUser?.providerUserId).equal(githubLoginPayload.id);
		expect(newAuthUser?.provider).equal(AuthProvider.GITHUB);
	});


	test('Register existing user by Github', async ({ app, db, authService }) => {
		await authService.registerByGithub(githubLoginPayload.id, githubLoginPayload.login);
		await request(app)
			.get('/api/v1/auth/github/callback')
			.set('Accept', 'application/json');
      
		const userAuth = await db.userAuth.findOne({ 
			providerUserId: githubLoginPayload.id,
			displayIdentifier: githubLoginPayload.login,
		});
		expect(userAuth?.providerUserId).equal(githubLoginPayload.id);
		expect(userAuth?.provider).equal(AuthProvider.GITHUB);
	});
  
  
	test('JWT Token after Register/Login by Github', async ({ app, db, authService, accessTokenCookie }) => {
		const res = await request(app)
			.get('/api/v1/auth/github/callback')
			.set('Accept', 'application/json')
			.redirects(0);
		expect(res.status).equal(302);

		const userAuth = await db.userAuth.findOne({
			providerUserId: githubLoginPayload.id,
			displayIdentifier: githubLoginPayload.login,
		});

		const accessToken = accessTokenCookie(res);
		expect(accessToken).toBeTruthy();

		const token = await authService.verifyJWT(accessToken!);
		expect(token.user_id).toBeTruthy();
		expect(token.user_id == Number(userAuth?.user?.id)).toBe(true);
	});

});



describe('Github Auth API - Bind', () => {
  
	const validUser = {
		username: "test",
		password: "test",
		confirmPassword: "test"
	};
  
	const oauthState = {
		state: 'test',
		userId: 0,
	};
  
	test.beforeAll(() => {
		vi.spyOn(AuthService.prototype, 'verifyOAuthState')
			.mockReturnValue(oauthState);
		vi.spyOn(AuthService.prototype, 'authorizeGithub')
			.mockResolvedValue(githubLoginPayload);
	});
  
  
	test.beforeEach(async ({ authService }) => {
		const user = await authService.register(
			validUser.username, 
			validUser.password, 
			validUser.confirmPassword,
		);
		oauthState.userId = Number(user.id);
	});
  
  
	test.afterEach(async ({ clearDatabaseRow }) => {
		await clearDatabaseRow();
	});
  
  
	test.afterAll(() => {
		vi.clearAllMocks();
	});
  
  
	test('Bind github account', async ({ app, db }) => {
		const res = await request(app)
			.get('/api/v1/auth/github/bind');
    
		const userAuth = await db.userAuth.findOne({
			providerUserId: githubLoginPayload.id,
			provider: AuthProvider.GITHUB,
		}, { populate: ['user'] });
    
		expect(userAuth?.user?.username).toBe(validUser.username);
		expect(res.status).equal(201);
	});
  
  
	test('Bind github account if exist', async ({ app, db, authService }) => {
		await authService.registerByGithub(
			githubLoginPayload.id, 
			githubLoginPayload.login,
		);
    
		const res = await request(app)
			.get('/api/v1/auth/github/bind');
    
		const userAuth = await db.userAuth.find({
			providerUserId: githubLoginPayload.id,
			provider: AuthProvider.GITHUB,
		});
		expect(userAuth.length).toBeLessThan(2);
		expect(res.status).equal(409);
	});

});


describe('Github Auth API - Unbind', () => {
  
	const validUser = {
		username: "test",
		password: "test",
		confirmPassword: "test"
	};
  
	test.afterEach(async ({ clearDatabaseRow }) => {
		await clearDatabaseRow();
	});
  
  
	test('Unbind github account', async ({ app, db, authService }) => {
		await authService.register(
			validUser.username, 
			validUser.password, 
			validUser.confirmPassword,
		);
		const passwordAuth = await db.userAuth.findOne({
			providerUserId: validUser.username,
			provider: AuthProvider.PASSWORD,
		}, { populate: ['user'] });
		const userId = Number(passwordAuth?.user!.id);
    
		await authService.bindGithubAccount(
			userId, 
			githubLoginPayload.id, 
			githubLoginPayload.login,
		);
		const accessToken = await authService.genereateUserToken(userId);
    
		const res = await request(app)
			.post('/api/v1/auth/github/unbind')
			.set('Cookie', `access_token=${accessToken}`);
    
		const boundAuth = await db.userAuth.findOne({
			providerUserId: githubLoginPayload.id,
			provider: AuthProvider.GITHUB,
		});
		expect(boundAuth).toBeNull();
		expect(res.status).equal(200);
	});
  
  
	test('Unbind github account if not bound', async ({ app, db, authService }) => {
		await authService.register(
			validUser.username, 
			validUser.password, 
			validUser.confirmPassword,
		);
		const passwordAuth = await db.userAuth.findOne({
			providerUserId: validUser.username,
			provider: AuthProvider.PASSWORD,
		}, { populate: ['user'] });
		const userId = Number(passwordAuth?.user!.id);
		const accessToken = await authService.genereateUserToken(userId);
    
		const res = await request(app)
			.post('/api/v1/auth/github/unbind')
			.set('Cookie', `access_token=${accessToken}`);
    
		expect(res.status).equal(404);
	});
});



describe('Github Auth API - Error', () => {

	beforeAll(() => {
		vi.spyOn(AuthService.prototype, 'authorizeGithub')
			.mockImplementation(async () => {
				throw new TypeError('Made up error');
			});
	});


	test('Error on authorize Github', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/github/callback');
		expect(res.status).equal(500);
	});

});