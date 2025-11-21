import { cn } from '@/lib/utils'

type HeartIconProps = {
  filled?: boolean
  className?: string
}

export function HeartIcon({ filled = false, className }: HeartIconProps) {
  if (filled) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={cn('h-4 w-4 text-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.55)]', className)}
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M12 21c-.33 0-.66-.11-.94-.34C9.22 19.3 3 14.11 3 8.59 3 5.57 5.46 3 8.46 3c1.66 0 3.22.75 4.24 1.97A5.56 5.56 0 0 1 16.94 3C19.94 3 22.4 5.57 22.4 8.59c0 5.52-6.22 10.71-8.06 12.07-.28.23-.61.34-.94.34Z"
        />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-4 w-4 text-slate-300 transition-colors', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden="true"
    >
      <path d="M19.8 4.2A5 5 0 0 0 16.27 3c-1.63 0-3.12.77-4.08 2.02C11.23 3.77 9.74 3 8.12 3A5 5 0 0 0 4.6 4.2 5.37 5.37 0 0 0 3 8.16c0 5.15 5.54 9.69 8.35 11.79.39.29.93.29 1.32 0 2.81-2.1 8.35-6.64 8.35-11.79A5.37 5.37 0 0 0 19.8 4.2Z" />
    </svg>
  )
}


