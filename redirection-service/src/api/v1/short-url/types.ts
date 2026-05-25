export interface IShortUrlSchema {
  id: number
  short_code: string
  long_url: string
  password: string | null
  expires_at: Date | string | null
  user_id: string
  deleted_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}
