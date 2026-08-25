import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QRPopover } from './QRPopover'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr">{value}</div>,
}))

describe('QRPopover', () => {
  it('shows qr code after opening, closes on second click', () => {
    render(<QRPopover value="http://localhost:8000/9xKp" caption="shrt.ly/9xKp" />)
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /show qr code/i }))
    expect(screen.getByTestId('qr')).toHaveTextContent('http://localhost:8000/9xKp')

    fireEvent.click(screen.getByRole('button', { name: /hide qr code/i }))
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument()
  })

  it('exposes expanded state to assistive tech', () => {
    render(<QRPopover value="v" caption="c" />)
    const btn = screen.getByRole('button', { name: /show qr code/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })
})
