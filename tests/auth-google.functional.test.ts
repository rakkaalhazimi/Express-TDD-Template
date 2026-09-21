import { describe, expect, vi, beforeAll } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";

import { AuthService } from "@/features/auth/auth.service.js";
import { AuthProvider } from "@/features/user/entities/UserAuth.js";
import { verifyAccessToken } from "@/utils/auth.js";



const googleLoginPayload = {
	sub: 'google-user-123',
	email: 'test@example.com',
};

// Code snippet to mock the class library
// vi.spyOn(googleAuth, 'OAuth2Client').mockImplementation(function () {
//   this.verifyIdToken = vi.fn().mockResolvedValue({
//     getPayload: () => googleLoginPayload
//   });
// });

describe('Google Auth API - Page', () => {

	test('GET google auth exists', async ({ app }) => {
		const res = await request(app)
			.get('/api/v1/auth/google')
			.redirects(0);
		expect(res.status).equal(302);
	});


	test('GET google auth callback exists', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/google/callback');
		expect(res.status).not.equal(404);
	});


	test('GET google bind exists', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/google-bind');
		expect(res.status).not.equal(404);
	});


	test('GET google bind callback exists', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/google/bind');
		expect(res.status).not.equal(404);
	});
});



describe('Google Auth API - Register', () => {

	beforeAll(() => {
		vi.spyOn(AuthService.prototype, 'authorizeGoogle')
			.mockResolvedValue(googleLoginPayload);
	});


	test.afterEach(async ({ clearDatabaseRow }) => {
		await clearDatabaseRow();
	});


	test('Register new user by Google', async ({ app, db }) => {
		await request(app).get('/api/v1/auth/google/callback');
		const newAuthUser = await db.userAuth.findOne({
			providerUserId: googleLoginPayload.sub,
			displayIdentifier: googleLoginPayload.email,
		});
		expect(newAuthUser?.providerUserId).equal(googleLoginPayload.sub);
		expect(newAuthUser?.provider).equal(AuthProvider.GOOGLE);
	});


	test('Register existing user by Google', async ({ app, db, authService }) => {
		await authService.registerByGoogle(googleLoginPayload.sub, googleLoginPayload.email);
		await request(app)
			.get('/api/v1/auth/google/callback')
			.set('Accept', 'application/json');

		const userAuth = await db.userAuth.findOne({
			providerUserId: googleLoginPayload.sub,
			displayIdentifier: googleLoginPayload.email,
		});
		expect(userAuth?.providerUserId).equal(googleLoginPayload.sub);
		expect(userAuth?.provider).equal(AuthProvider.GOOGLE);
	});


	test('JWT Token after Register/Login by Google', async ({ app, db, accessTokenCookie }) => {
		const res = await request(app)
			.get('/api/v1/auth/google/callback')
			.set('Accept', 'application/json')
			.redirects(0);
		expect(res.status).equal(302);

		const userAuth = await db.userAuth.findOne({
			providerUserId: googleLoginPayload.sub,
			displayIdentifier: googleLoginPayload.email,
		});

		const accessToken = accessTokenCookie(res);
		expect(accessToken).toBeTruthy();

		const token = await verifyAccessToken(accessToken!);
		expect(token.user_id).toBeTruthy();
		expect(token.user_id == Number(userAuth?.user?.id)).toBe(true);
	});
});


describe('Google Auth API - Bind', () => {

	const validUser = {
		username: "test",
		password: "test",
		confirmPassword: "test",
	};

	const oauthState = {
		state: 'test',
		userId: 0,
	};

	test.beforeAll(() => {
		vi.spyOn(AuthService.prototype, 'verifyOAuthState')
			.mockReturnValue(oauthState);
		vi.spyOn(AuthService.prototype, 'authorizeGoogle')
			.mockResolvedValue(googleLoginPayload);
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


	test('Bind google account', async ({ app, db }) => {
		const res = await request(app)
			.get('/api/v1/auth/google/bind');

		const userAuth = await db.userAuth.findOne({
			providerUserId: googleLoginPayload.sub,
			provider: AuthProvider.GOOGLE,
		}, { populate: ['user'] });

		expect(userAuth?.user?.username).toBe(validUser.username);
		expect(res.status).equal(201);
	});


	test('Bind google account if exist', async ({ app, db, authService }) => {
		await authService.registerByGoogle(
			googleLoginPayload.sub,
			googleLoginPayload.email,
		);

		const res = await request(app)
			.get('/api/v1/auth/google/bind');

		const userAuth = await db.userAuth.find({
			providerUserId: googleLoginPayload.sub,
			provider: AuthProvider.GOOGLE,
		});
		expect(userAuth.length).toBeLessThan(2);
		expect(res.status).equal(409);
	});
});



describe('Google Auth API - Unbind', () => {

	const validUser = {
		username: "test",
		password: "test",
		confirmPassword: "test",
	};

	test.afterEach(async ({ clearDatabaseRow }) => {
		await clearDatabaseRow();
	});


	test('Unbind google account', async ({ app, db, authService }) => {
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

		await authService.bindGoogleAccount(
			userId,
			googleLoginPayload.sub,
			googleLoginPayload.email,
		);
		const accessToken = await authService.genereateUserToken(userId);

		const res = await request(app)
			.post('/api/v1/auth/google/unbind')
			.set('Cookie', `access_token=${accessToken}`);

		const boundAuth = await db.userAuth.findOne({
			providerUserId: googleLoginPayload.sub,
			provider: AuthProvider.GOOGLE,
		});
		expect(boundAuth).toBeNull();
		expect(res.status).equal(200);
	});


	test('Unbind google account if not bound', async ({ app, db, authService }) => {
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
			.post('/api/v1/auth/google/unbind')
			.set('Cookie', `access_token=${accessToken}`);

		expect(res.status).equal(404);
	});
});



describe('Google Auth API - Error', () => {

	beforeAll(() => {
		vi.spyOn(AuthService.prototype, 'authorizeGoogle')
			.mockImplementation(async () => {
				throw new TypeError('Made up error');
			});
	});

	test('Error on authorize Google', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/google/callback');
		expect(res.status).equal(500);
	});
});