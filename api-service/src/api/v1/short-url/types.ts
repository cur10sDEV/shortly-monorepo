export interface IShortUrlSchema {
  id: number
  short_code: string
  long_url: string
  password: string | null
  expires_at: EpochTimeStamp | null
  user_id: string
  deleted_at: EpochTimeStamp | null
  created_at: EpochTimeStamp
  updated_at: EpochTimeStamp
}
