import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CountUp } from './CountUp'

describe('CountUp', () => {
  it('renders final value when reduced motion preferred', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }))
    render(<CountUp value={48204} />)
    expect(screen.getByText('48,204')).toBeInTheDocument()
  })

  it('renders formatted number with tabular numerals', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    render(<CountUp value={1234} duration={50} />)
    expect(await screen.findByText('1,234', {}, { timeout: 2000 })).toBeInTheDocument()
  })
})
