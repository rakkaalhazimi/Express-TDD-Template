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
import { createAppError } from '@/error.js';
import { logError } from '@/middleware/logger.js';
import { createErrorResponse } from '@/response.js';



export function createAuthController(db: Services) {
	const AuthController = express.Router();
	const authService = createAuthService(db);


	AuthController.post('/login', async (req: Request, res: Response) => {
		try {
			const { username, password } = req.body as UserLoginDto;
			const user = await authService.login(username, password);
			const accessToken = await authService.genereateUserToken(Number(user.id));
			authService.setAccessTokenCookie(res, accessToken);
			return res.status(StatusCodes.OK).json({
				message: 'Login success',
				data: { accessToken },
			});

		} catch (error) {
			const appError = createAppError(error, 'Login failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.post('/register', async (req: Request, res: Response) => {
		try {
			const { username, password, confirmPassword } = req.body as UserRegistrationDto;
			const userAuth = await authService.register(username, password, confirmPassword);
			return res.status(StatusCodes.CREATED).send({
				message: 'Register success',
				data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
			});

		} catch (error) {
			const appError = createAppError(error, 'Register failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/logout', async (req: Request, res: Response) => {
		delete req.session.oauth;
		authService.clearAccessTokenCookie(res);
		return res.redirect('/');
	});


	AuthController.post('/password/bind', async (req: Request, res: Response) => {
		try {
			const accessToken = authService.getAccessTokenCookie(req);
			const decoded = await authService.verifyJWT(accessToken);
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

		} catch (error) {
			const appError = createAppError(error, 'Bind password auth failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/google', async (req: Request, res: Response) => {
		try {
			const oauthUrl = authService.createGoogleOAuthUrl(Env.GOOGLE_REDIRECT_URI!);
			res.redirect(oauthUrl);

		} catch(error) {
			const appError = createAppError(error, 'Google login failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/google/callback', async (req: Request, res: Response) => {
		try {
			const payload = await authService.authorizeGoogle(req, Env.GOOGLE_REDIRECT_URI!);
			const userAuth = await authService.registerByGoogle(payload.sub, payload.email!);
			const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
			authService.setAccessTokenCookie(res, accessToken);
			return res.redirect('/');

		} catch (error) {
			const appError = createAppError(error, 'Google authentication failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/google-bind', async (req: Request, res: Response) => {
		try {
			req.session.oauth = await authService.createOAuthState(req);
			const oauthUrl = authService.createGoogleOAuthUrl(
				Env.GOOGLE_BIND_REDIRECT_URI!,
				req.session.oauth.state,
			);
			res.redirect(oauthUrl);

		} catch(error) {
			const appError = createAppError(error, 'Google bind account failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/google/bind', async (req: Request, res: Response) => {
		try {
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

		} catch (error) {
			const appError = createAppError(error, 'Bind google auth failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.post('/google/unbind', async (req: Request, res: Response) => {
		try {
			const accessToken = authService.getAccessTokenCookie(req);
			const decoded = await authService.verifyJWT(accessToken);
			const userAuth = await authService.unbindGoogleAccount(decoded.user_id);

			return res.status(StatusCodes.OK).json({
				message: 'Unbind google auth success',
				data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
			});

		} catch (error) {
			const appError = createAppError(error, 'Unbind google auth failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/github', async (req: Request, res: Response) => {
		const oauthUrl = authService.createGithubOAuthUrl(Env.GITHUB_REDIRECT_URI!);
		res.redirect(oauthUrl);
	});


	AuthController.get('/github/callback', async (req: Request, res: Response) => {
		try {
			const payload = await authService.authorizeGithub(req, Env.GITHUB_REDIRECT_URI!);
			const userAuth = await authService.registerByGithub(String(payload.id), payload.login);
			const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
			authService.setAccessTokenCookie(res, accessToken);
			return res.redirect('/');

		} catch (error) {
			const appError = createAppError(error, 'Github authentication failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/github-bind', async (req: Request, res: Response) => {
		try {
			req.session.oauth = await authService.createOAuthState(req);
			const oauthUrl = authService.createGithubOAuthUrl(
				Env.GITHUB_BIND_REDIRECT_URI!,
				req.session.oauth.state,
			);
			res.redirect(oauthUrl);

		} catch(error) {
			const appError = createAppError(error, 'Github bind account failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/github/bind', async (req: Request, res: Response) => {
		try {
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

		} catch (error) {
			const appError = createAppError(error, 'Bind github auth failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.post('/github/unbind', async (req: Request, res: Response) => {
		try {
			const accessToken = authService.getAccessTokenCookie(req);
			const decoded = await authService.verifyJWT(accessToken);
			const userAuth = await authService.unbindGithubAccount(decoded.user_id);

			return res.status(StatusCodes.OK).json({
				message: 'Unbind github auth success',
				data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
			});

		} catch (error) {
			const appError = createAppError(error, 'Unbind github auth failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/discord', async (req: Request, res: Response) => {
		const oauthUrl = authService.createDiscordOAuthUrl(Env.DISCORD_REDIRECT_URI!);
		res.redirect(oauthUrl);
	});


	AuthController.get('/discord/callback', async (req: Request, res: Response) => {
		try {
			const payload = await authService.authorizeDiscord(req, Env.DISCORD_REDIRECT_URI!);
			const userAuth = await authService.registerByDiscord(String(payload.id), payload.username);
			const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
			authService.setAccessTokenCookie(res, accessToken);
			return res.redirect('/');

		} catch (error) {
			const appError = createAppError(error, 'Discord authentication failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/discord-bind', async (req: Request, res: Response) => {
		try {
			req.session.oauth = await authService.createOAuthState(req);
			const oauthUrl = authService.createDiscordOAuthUrl(
				Env.DISCORD_BIND_REDIRECT_URI!,
				req.session.oauth.state,
			);
			res.redirect(oauthUrl);

		} catch(error) {
			const appError = createAppError(error, 'Discord bind account failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/discord/bind', async (req: Request, res: Response) => {
		try {
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

		} catch (error) {
			const appError = createAppError(error, 'Bind discord auth failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.post('/discord/unbind', async (req: Request, res: Response) => {
		try {
			const accessToken = authService.getAccessTokenCookie(req);
			const decoded = await authService.verifyJWT(accessToken);
			const userAuth = await authService.unbindDiscordAccount(decoded.user_id);

			return res.status(StatusCodes.OK).json({
				message: 'Unbind discord auth success',
				data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
			});

		} catch (error) {
			const appError = createAppError(error, 'Unbind discord auth failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/microsoft', async (req: Request, res: Response) => {
		const oauthUrl = await authService.createMicrosoftOAuthUrl(Env.MICROSOFT_REDIRECT_URI!);
		res.redirect(oauthUrl);
	});


	AuthController.get('/microsoft/callback', async (req: Request, res: Response) => {
		try {
			const payload = await authService.authorizeMicrosoft(req, Env.MICROSOFT_REDIRECT_URI!);
			const userAuth = await authService.registerByMicrosoft(String(payload.id), payload.userPrincipalName);
			const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
			authService.setAccessTokenCookie(res, accessToken);
			return res.redirect('/');

		} catch (error) {
			const appError = createAppError(error, 'Microsoft authentication failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/microsoft-bind', async (req: Request, res: Response) => {
		try {
			req.session.oauth = await authService.createOAuthState(req);
			const oauthUrl = await authService.createMicrosoftOAuthUrl(
				Env.MICROSOFT_REDIRECT_URI!,
				req.session.oauth.state,
			);
			res.redirect(oauthUrl);

		} catch(error) {
			const appError = createAppError(error, 'Microsoft bind account failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.get('/microsoft/bind', async (req: Request, res: Response) => {
		try {
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

		} catch (error) {
			const appError = createAppError(error, 'Bind microsoft auth failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});


	AuthController.post('/microsoft/unbind', async (req: Request, res: Response) => {
		try {
			const accessToken = authService.getAccessTokenCookie(req);
			const decoded = await authService.verifyJWT(accessToken);
			const userAuth = await authService.unbindMicrosoftAccount(decoded.user_id);

			return res.status(StatusCodes.OK).json({
				message: 'Unbind microsoft auth success',
				data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
			});

		} catch (error) {
			const appError = createAppError(error, 'Unbind microsoft auth failed');
			logError(req, appError);
			const errorResponse = createErrorResponse(appError);
			return res.status(appError.status).json(errorResponse);
		}
	});

	return AuthController;
}