import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  value: string
  caption: string
}

export function QRPopover({ value, caption }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? 'Hide QR code' : 'Show QR code'}
        title={open ? 'Hide QR code' : 'Show QR code'}
        className="p-2 rounded-lg border border-line hover:bg-surface-muted transition-colors"
      >
        <QrCode className="w-3.5 h-3.5 text-ink-muted" aria-hidden />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`QR code for ${caption}`}
          className="absolute right-0 top-full mt-2 z-30 w-max rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-overlay)] animate-rise"
        >
          <QRCodeSVG value={value} size={128} bgColor="#FFFFFF" fgColor="#37352F" level="M" />
          <p className="mt-2 text-center font-mono text-[11px] text-ink-muted">{caption}</p>
          <p className="text-center text-[10px] text-ink-faint">Scan to open</p>
        </div>
      )}
    </div>
  )
}
