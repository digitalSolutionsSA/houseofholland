import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './GradientButton.css'

type GradientButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  fullWidth?: boolean
}

export function GradientButton({
  children,
  fullWidth = true,
  className = '',
  ...props
}: GradientButtonProps) {
  return (
    <button
      type="button"
      className={`gradient-btn ${fullWidth ? 'gradient-btn--full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
