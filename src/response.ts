export interface Response<T = any> {
  message: string,
  data: T,
  status: number
};