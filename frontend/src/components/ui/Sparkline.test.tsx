import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Sparkline } from './Sparkline'

describe('Sparkline', () => {
  it('renders an svg polyline with one point per datum plus end dot', () => {
    const { container } = render(<Sparkline points={[0, 3, 1, 7]} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.querySelectorAll('circle')).toHaveLength(1)
    const polyline = svg?.querySelector('polyline')
    expect(polyline?.getAttribute('points')?.trim().split(/\s+/)).toHaveLength(4)
  })

  it('is accessible via aria-label', () => {
    const { container } = render(<Sparkline points={[1, 2, 3]} label="7 clicks over 14 days" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', '7 clicks over 14 days')
  })
})
