import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { useFocusTrap } from './focusTrap'

function Harness({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, active)
  return (
    <div>
      <button>outside</button>
      <div ref={ref}>
        <button>first</button>
        <button>last</button>
      </div>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('focuses first element when activated and restores focus on deactivate', () => {
    const { rerender } = render(<Harness active={false} />)
    ;(document.activeElement as HTMLElement).blur()
    rerender(<Harness active />)
    expect(document.activeElement).toHaveTextContent('first')
  })

  it('wraps Tab from last back to first', () => {
    const { getByText } = render(<Harness active />)
    const last = getByText('last')
    last.focus()
    const evt = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    document.dispatchEvent(evt)
    expect(document.activeElement).toHaveTextContent('first')
  })
})
