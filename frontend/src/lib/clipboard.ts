import { toast } from 'sonner'

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function copyWithToast(text: string, message = 'Copied to clipboard'): Promise<void> {
  if (await copyToClipboard(text)) {
    toast.success(message)
  } else {
    toast.error('Could not access the clipboard')
  }
}
