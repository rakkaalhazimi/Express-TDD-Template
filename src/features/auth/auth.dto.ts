export interface TokenPayload {
	user_id: number;
};

export interface GoogleUserPayload {
	sub: string;
	email: string;
	name: string;
};

export interface GithubUserPayload {
	id: string;
	login: string;
};

export interface DiscordUserPayload {
	id: string;
	username: string;
};

export interface MicrosoftUserPayload {
	id: string;
	userPrincipalName: string;
};

export interface OAuthBindState {
	state: string;
	userId: number;
}

export interface UserLoginDto {
	username: string;
	password: string;
}

export interface UserRegistrationDto {
	username: string;
	password: string;
	confirmPassword: string;
}

export interface UserPasswordBindDto extends UserRegistrationDto {
	id: string;
}