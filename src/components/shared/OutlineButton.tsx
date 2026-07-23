import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './OutlineButton.css'

type OutlineButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  fullWidth?: boolean
}

export function OutlineButton({
  children,
  fullWidth = true,
  className = '',
  ...props
}: OutlineButtonProps) {
  return (
    <button
      type="button"
      className={`outline-btn ${fullWidth ? 'outline-btn--full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
