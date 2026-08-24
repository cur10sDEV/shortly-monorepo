import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatBars } from './StatBars'

describe('StatBars', () => {
  it('renders label, value and percent width', () => {
    const { container } = render(
      <StatBars title="Top referrers" rows={[{ key: 'google.com', value: 60, percentage: 60 }, { key: 'Direct', value: 40, percentage: 40 }]} />,
    )
    expect(screen.getByText('google.com')).toBeInTheDocument()
    expect(screen.getByText('Direct')).toBeInTheDocument()
    const fills = container.querySelectorAll('[data-testid="bar-fill"]')
    expect(fills[0]).toHaveStyle({ width: '60%' })
  })

  it('shows empty message', () => {
    render(<StatBars title="Locations" rows={[]} emptyMessage="No data yet" />)
    expect(screen.getByText('No data yet')).toBeInTheDocument()
  })
})
