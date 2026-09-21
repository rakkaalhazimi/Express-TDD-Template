import { describe, expect, vi, beforeAll } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";

import { AuthService } from "@/features/auth/auth.service.js";
import { AuthProvider, UserAuthSchema } from "@/features/user/entities/UserAuth.js";
import { verifyAccessToken } from "@/utils/auth.js";



const microsoftLoginPayload = {
	id: 'microsoft-user-123',
	userPrincipalName: 'user@example.com',
};

describe('Microsoft Auth API - Page', () => {

	test('GET microsoft auth exists', async ({ app }) => {
		const res = await request(app)
			.get('/api/v1/auth/microsoft')
			.redirects(0);
		expect(res.status).equal(302);
	});


	test('GET microsoft auth callback exists', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/microsoft/callback');
		expect(res.status).not.equal(404);
	});


	test('GET microsoft bind exists', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/microsoft-bind');
		expect(res.status).not.equal(404);
	});


	test('GET microsoft bind callback exists', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/microsoft/bind');
		expect(res.status).not.equal(404);
	});
});



describe('Microsoft Auth API - Register', () => {

	beforeAll(() => {
		vi.spyOn(AuthService.prototype, 'authorizeMicrosoft')
			.mockResolvedValue(microsoftLoginPayload);
	});


	test.afterEach(async ({ clearDatabaseRow }) => {
		await clearDatabaseRow();
	});


	test('Register new user by Microsoft', async ({ app, db }) => {
		await request(app).get('/api/v1/auth/microsoft/callback');
		const newAuthUser = await db.userAuth.findOne({
			providerUserId: microsoftLoginPayload.id,
			displayIdentifier: microsoftLoginPayload.userPrincipalName,
		});
		expect(newAuthUser?.providerUserId).equal(microsoftLoginPayload.id);
		expect(newAuthUser?.provider).equal(AuthProvider.MICROSOFT);
	});


	test('Register existing user by Microsoft', async ({ app, db, authService }) => {
		await authService.registerByMicrosoft(microsoftLoginPayload.id, microsoftLoginPayload.userPrincipalName);
		await request(app)
			.get('/api/v1/auth/microsoft/callback')
			.set('Accept', 'application/json');

		const userAuth = await db.userAuth.findOne({
			providerUserId: microsoftLoginPayload.id,
			displayIdentifier: microsoftLoginPayload.userPrincipalName,
		});
		expect(userAuth?.providerUserId).equal(microsoftLoginPayload.id);
		expect(userAuth?.provider).equal(AuthProvider.MICROSOFT);
	});


	test('JWT Token after Register/Login by Microsoft', async ({ app, db, accessTokenCookie }) => {
		const res = await request(app)
			.get('/api/v1/auth/microsoft/callback')
			.set('Accept', 'application/json')
			.redirects(0);
		expect(res.status).equal(302);

		const userAuth = await db.userAuth.findOne({
			providerUserId: microsoftLoginPayload.id,
			displayIdentifier: microsoftLoginPayload.userPrincipalName,
		});

		const accessToken = accessTokenCookie(res);
		expect(accessToken).toBeTruthy();

		const token = await verifyAccessToken(accessToken!);
		expect(token.user_id).toBeTruthy();
		expect(token.user_id == Number(userAuth?.user?.id)).toBe(true);
	});

});



describe('Microsoft Auth API - Bind', () => {

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
		vi.spyOn(AuthService.prototype, 'authorizeMicrosoft')
			.mockResolvedValue(microsoftLoginPayload);
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


	test('Bind microsoft account', async ({ app, db }) => {
		const res = await request(app)
			.get('/api/v1/auth/microsoft/bind');

		const userAuth = await db.userAuth.findOne({
			providerUserId: microsoftLoginPayload.id,
			provider: AuthProvider.MICROSOFT,
		}, { populate: ['user'] });

		expect(userAuth?.user?.username).toBe(validUser.username);
		expect(res.status).equal(201);
	});


	test('Bind microsoft account if exist', async ({ app, db, authService }) => {
		await authService.registerByMicrosoft(
			microsoftLoginPayload.id,
			microsoftLoginPayload.userPrincipalName,
		);

		const res = await request(app)
			.get('/api/v1/auth/microsoft/bind');

		const userAuth = await db.userAuth.find({
			providerUserId: microsoftLoginPayload.id,
			provider: AuthProvider.MICROSOFT,
		});
		expect(userAuth.length).toBeLessThan(2);
		expect(res.status).equal(409);
	});

});


describe('Microsoft Auth API - Unbind', () => {

	const validUser = {
		username: "test",
		password: "test",
		confirmPassword: "test",
	};

	test.afterEach(async ({ clearDatabaseRow }) => {
		await clearDatabaseRow();
	});


	test('Unbind microsoft account', async ({ app, db, authService }) => {
		await authService.register(
			validUser.username,
			validUser.password,
			validUser.confirmPassword,
		);
		const passwordAuth = await db.userAuth.findOne({
			providerUserId: validUser.username,
			provider: AuthProvider.PASSWORD,
		}, { populate: ['user'] });
		const userId = Number(passwordAuth!.user.id);

		db.em.create(UserAuthSchema, {
			user: passwordAuth!.user,
			provider: AuthProvider.MICROSOFT,
			providerUserId: microsoftLoginPayload.id,
			displayIdentifier: microsoftLoginPayload.userPrincipalName,
		});
		await db.em.flush();
		const accessToken = await authService.genereateUserToken(userId);

		const res = await request(app)
			.post('/api/v1/auth/microsoft/unbind')
			.set('Cookie', `access_token=${accessToken}`);

		const boundAuth = await db.userAuth.findOne({
			providerUserId: microsoftLoginPayload.id,
			provider: AuthProvider.MICROSOFT,
		});
		expect(boundAuth).toBeNull();
		expect(res.status).equal(200);
	});


	test('Unbind microsoft account if not bound', async ({ app, db, authService }) => {
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
			.post('/api/v1/auth/microsoft/unbind')
			.set('Cookie', `access_token=${accessToken}`);

		expect(res.status).equal(404);
	});
});



describe('Microsoft Auth API - Error', () => {

	beforeAll(() => {
		vi.spyOn(AuthService.prototype, 'authorizeMicrosoft')
			.mockImplementation(async () => {
				throw new TypeError('Made up error');
			});
	});


	test('Error on authorize Microsoft', async ({ app }) => {
		const res = await request(app).get('/api/v1/auth/microsoft/callback');
		expect(res.status).equal(500);
	});

});
