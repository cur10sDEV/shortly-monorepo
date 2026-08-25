import { describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { copyWithToast } from './clipboard'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('copyWithToast', () => {
  it('writes to clipboard and fires success toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    await copyWithToast('shrt.ly/x', 'Link copied')
    expect(writeText).toHaveBeenCalledWith('shrt.ly/x')
    expect(toast.success).toHaveBeenCalledWith('Link copied')
  })

  it('fires error toast on failure', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await copyWithToast('x', 'Link copied')
    expect(toast.error).toHaveBeenCalled()
  })
})
