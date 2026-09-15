export interface TokenPayload {
  user_id: number;
};

export interface OAuthBindState {
  state: string;
  userId: number;
}