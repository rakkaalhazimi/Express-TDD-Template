import express from 'express';
import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import type {
	UserLoginDto,
	UserRegistrationDto,
} from './auth.dto.js';
import { createAuthService } from './auth.service.js';
import type { Services } from '@/db/db.js';
import Env from '@/env-loader.js';
import { verifyAccessToken } from '@/utils/auth.js';



export function createAuthController(db: Services) {
	const AuthController = express.Router();
	const authService = createAuthService(db);


	AuthController.post('/login', async (req: Request, res: Response) => {
		const { username, password } = req.body as UserLoginDto;
		const user = await authService.login(username, password);
		const accessToken = await authService.genereateUserToken(Number(user.id));
		authService.setAccessTokenCookie(res, accessToken);
		return res.status(StatusCodes.OK).json({
			message: 'Login success',
			data: { accessToken },
		});
	});


	AuthController.post('/register', async (req: Request, res: Response) => {
		const { username, password, confirmPassword } = req.body as UserRegistrationDto;
		const userAuth = await authService.register(username, password, confirmPassword);
		return res.status(StatusCodes.CREATED).send({
			message: 'Register success',
			data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
		});
	});


	AuthController.get('/logout', async (req: Request, res: Response) => {
		delete req.session.oauth;
		authService.clearAccessTokenCookie(res);
		return res.redirect('/');
	});


	AuthController.post('/password/bind', async (req: Request, res: Response) => {
		const accessToken = authService.getAccessTokenCookie(req);
		const decoded = await verifyAccessToken(accessToken);
		const { username, password, confirmPassword } = req.body as UserRegistrationDto;
		const userAuth = await authService.bindPasswordAccount(
			decoded.user_id,
			username,
			password,
			confirmPassword,
		);
		return res.status(StatusCodes.CREATED).send({
			message: 'Bind password auth success',
			data: { username, provider: userAuth.provider },
		});
	});


	AuthController.get('/google', async (_req: Request, res: Response) => {
		const oauthUrl = authService.createGoogleOAuthUrl(Env.GOOGLE_REDIRECT_URI!);
		res.redirect(oauthUrl);
	});


	AuthController.get('/google/callback', async (req: Request, res: Response) => {
		const payload = await authService.authorizeGoogle(req, Env.GOOGLE_REDIRECT_URI!);
		const userAuth = await authService.registerByGoogle(payload.sub, payload.email!);
		const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
		authService.setAccessTokenCookie(res, accessToken);
		return res.redirect('/');
	});


	AuthController.get('/google-bind', async (req: Request, res: Response) => {
		req.session.oauth = await authService.createOAuthState(req);
		const oauthUrl = authService.createGoogleOAuthUrl(
			Env.GOOGLE_BIND_REDIRECT_URI!,
			req.session.oauth.state,
		);
		res.redirect(oauthUrl);
	});


	AuthController.get('/google/bind', async (req: Request, res: Response) => {
		const { state } = req.query;
		const payload = await authService.authorizeGoogle(req, Env.GOOGLE_BIND_REDIRECT_URI!);
		const authState = authService.verifyOAuthState(req, state as string);
		const userAuth = await authService.bindGoogleAccount(authState.userId, payload.sub, payload.email!);

		return res.status(StatusCodes.CREATED).send({
			message: 'Bind google auth success',
			data: {
				providerUserId: userAuth.providerUserId,
				provider: userAuth.provider,
			},
		});
	});


	AuthController.post('/google/unbind', async (req: Request, res: Response) => {
		const accessToken = authService.getAccessTokenCookie(req);
		const decoded = await verifyAccessToken(accessToken);
		const userAuth = await authService.unbindGoogleAccount(decoded.user_id);

		return res.status(StatusCodes.OK).json({
			message: 'Unbind google auth success',
			data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
		});
	});


	AuthController.get('/github', async (_req: Request, res: Response) => {
		const oauthUrl = authService.createGithubOAuthUrl(Env.GITHUB_REDIRECT_URI!);
		res.redirect(oauthUrl);
	});


	AuthController.get('/github/callback', async (req: Request, res: Response) => {
		const payload = await authService.authorizeGithub(req, Env.GITHUB_REDIRECT_URI!);
		const userAuth = await authService.registerByGithub(String(payload.id), payload.login);
		const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
		authService.setAccessTokenCookie(res, accessToken);
		return res.redirect('/');
	});


	AuthController.get('/github-bind', async (req: Request, res: Response) => {
		req.session.oauth = await authService.createOAuthState(req);
		const oauthUrl = authService.createGithubOAuthUrl(
			Env.GITHUB_BIND_REDIRECT_URI!,
			req.session.oauth.state,
		);
		res.redirect(oauthUrl);
	});


	AuthController.get('/github/bind', async (req: Request, res: Response) => {
		const { state } = req.query;
		const payload = await authService.authorizeGithub(req, Env.GITHUB_BIND_REDIRECT_URI!);
		const authState = authService.verifyOAuthState(req, state as string);
		const userAuth = await authService.bindGithubAccount(
			authState.userId,
			String(payload.id),
			payload.login,
		);

		return res.status(StatusCodes.CREATED).send({
			message: 'Bind github auth success',
			data: {
				providerUserId: userAuth.providerUserId,
				provider: userAuth.provider,
			},
		});
	});


	AuthController.post('/github/unbind', async (req: Request, res: Response) => {
		const accessToken = authService.getAccessTokenCookie(req);
		const decoded = await verifyAccessToken(accessToken);
		const userAuth = await authService.unbindGithubAccount(decoded.user_id);

		return res.status(StatusCodes.OK).json({
			message: 'Unbind github auth success',
			data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
		});
	});


	AuthController.get('/discord', async (_req: Request, res: Response) => {
		const oauthUrl = authService.createDiscordOAuthUrl(Env.DISCORD_REDIRECT_URI!);
		res.redirect(oauthUrl);
	});


	AuthController.get('/discord/callback', async (req: Request, res: Response) => {
		const payload = await authService.authorizeDiscord(req, Env.DISCORD_REDIRECT_URI!);
		const userAuth = await authService.registerByDiscord(String(payload.id), payload.username);
		const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
		authService.setAccessTokenCookie(res, accessToken);
		return res.redirect('/');
	});


	AuthController.get('/discord-bind', async (req: Request, res: Response) => {
		req.session.oauth = await authService.createOAuthState(req);
		const oauthUrl = authService.createDiscordOAuthUrl(
			Env.DISCORD_BIND_REDIRECT_URI!,
			req.session.oauth.state,
		);
		res.redirect(oauthUrl);
	});


	AuthController.get('/discord/bind', async (req: Request, res: Response) => {
		const { state } = req.query;
		const payload = await authService.authorizeDiscord(req, Env.DISCORD_BIND_REDIRECT_URI!);
		const authState = authService.verifyOAuthState(req, state as string);
		const userAuth = await authService.bindDiscordAccount(
			authState.userId,
			String(payload.id),
			payload.username,
		);

		return res.status(StatusCodes.CREATED).send({
			message: 'Bind discord auth success',
			data: {
				providerUserId: userAuth.providerUserId,
				provider: userAuth.provider,
			},
		});
	});


	AuthController.post('/discord/unbind', async (req: Request, res: Response) => {
		const accessToken = authService.getAccessTokenCookie(req);
		const decoded = await verifyAccessToken(accessToken);
		const userAuth = await authService.unbindDiscordAccount(decoded.user_id);

		return res.status(StatusCodes.OK).json({
			message: 'Unbind discord auth success',
			data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
		});
	});


	AuthController.get('/microsoft', async (_req: Request, res: Response) => {
		const oauthUrl = await authService.createMicrosoftOAuthUrl(Env.MICROSOFT_REDIRECT_URI!);
		res.redirect(oauthUrl);
	});


	AuthController.get('/microsoft/callback', async (req: Request, res: Response) => {
		const payload = await authService.authorizeMicrosoft(req, Env.MICROSOFT_REDIRECT_URI!);
		const userAuth = await authService.registerByMicrosoft(String(payload.id), payload.userPrincipalName);
		const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
		authService.setAccessTokenCookie(res, accessToken);
		return res.redirect('/');
	});


	AuthController.get('/microsoft-bind', async (req: Request, res: Response) => {
		req.session.oauth = await authService.createOAuthState(req);
		const oauthUrl = await authService.createMicrosoftOAuthUrl(
			Env.MICROSOFT_BIND_REDIRECT_URI!,
			req.session.oauth.state,
		);
		res.redirect(oauthUrl);
	});


	AuthController.get('/microsoft/bind', async (req: Request, res: Response) => {
		const { state } = req.query;
		const payload = await authService.authorizeMicrosoft(req, Env.MICROSOFT_BIND_REDIRECT_URI!);
		const authState = authService.verifyOAuthState(req, state as string);
		const userAuth = await authService.bindMicrosoftAccount(
			authState.userId,
			String(payload.id),
			payload.userPrincipalName,
		);

		return res.status(StatusCodes.CREATED).send({
			message: 'Bind microsoft auth success',
			data: {
				providerUserId: userAuth.providerUserId,
				provider: userAuth.provider,
			},
		});
	});


	AuthController.post('/microsoft/unbind', async (req: Request, res: Response) => {
		const accessToken = authService.getAccessTokenCookie(req);
		const decoded = await verifyAccessToken(accessToken);
		const userAuth = await authService.unbindMicrosoftAccount(decoded.user_id);

		return res.status(StatusCodes.OK).json({
			message: 'Unbind microsoft auth success',
			data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
		});
	});

	return AuthController;
}