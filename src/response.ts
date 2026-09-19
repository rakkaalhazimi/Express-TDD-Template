export interface ServerResponse<T = unknown> {
	message: string,
	data: T,
	error?: string,
	status: number
};