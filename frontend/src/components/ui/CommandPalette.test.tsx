import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CommandPalette } from './CommandPalette'

vi.mock('../../hooks/useLinks', () => ({
  useLinks: () => ({
    data: {
      data: [
        { id: 42, short_code: '9xKp', long_url: 'https://stripe.com/payments', short_url: 'http://r/9xKp' },
        { id: 43, short_code: 'aB3d', long_url: 'https://github.com/x', short_url: 'http://r/aB3d' },
      ],
    },
  }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const noop = () => {}

describe('CommandPalette', () => {
  it('renders nav commands when open', () => {
    render(<CommandPalette open onOpenChange={noop} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Create new link')).toBeInTheDocument()
  })

  it('filters links by search term', () => {
    render(<CommandPalette open onOpenChange={noop} />)
    const input = screen.getByPlaceholderText(/type a command/i)
    fireEvent.change(input, { target: { value: 'stripe' } })
    expect(screen.getByText(/stripe\.com\/payments/)).toBeInTheDocument()
    expect(screen.queryByText(/github\.com\/x/)).not.toBeInTheDocument()
  })

  it('navigates on selecting a page command', () => {
    const onNavigate = vi.fn()
    render(<CommandPalette open onOpenChange={noop} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Settings'))
    expect(onNavigate).toHaveBeenCalledWith('/settings')
  })

  it('copies a link url on select', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<CommandPalette open onOpenChange={noop} />)
    fireEvent.click(screen.getByText(/9xKp/))
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('http://r/9xKp'))
  })
})
