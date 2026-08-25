import { describe, expect, it } from 'vitest'
import { getLinkStatus } from './linkStatus'
import type { Link } from '../types'

const base = {
  id: 1,
  short_code: '9xKp',
  long_url: 'https://example.com',
  user_id: 'u',
  created_at: '',
  updated_at: '',
  short_url: '',
} satisfies Link

describe('getLinkStatus', () => {
  it('flags active links', () => {
    expect(getLinkStatus(base)).toEqual({ label: 'Active', tone: 'green' })
  })

  it('flags expired when expires_at is past', () => {
    const link = { ...base, expires_at: new Date(Date.now() - 1000).toISOString() }
    expect(getLinkStatus(link)).toEqual({ label: 'Expired', tone: 'amber' })
  })

  it('flags protected by password presence', () => {
    expect(getLinkStatus({ ...base, password: 'hashed' })).toEqual({ label: 'Protected', tone: 'purple' })
  })

  it('flags deleted before anything else', () => {
    const link = { ...base, password: 'h', deleted_at: new Date().toISOString() }
    expect(getLinkStatus(link)).toEqual({ label: 'Deleted', tone: 'red' })
  })
})
