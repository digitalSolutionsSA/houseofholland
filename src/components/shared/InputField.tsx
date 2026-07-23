import type { InputHTMLAttributes, ReactNode } from 'react'
import './InputField.css'

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  onRightIconClick?: () => void
}

export function InputField({
  leftIcon,
  rightIcon,
  onRightIconClick,
  className = '',
  ...props
}: InputFieldProps) {
  return (
    <div className={`input-field ${className}`}>
      {leftIcon && <span className="input-field__icon input-field__icon--left">{leftIcon}</span>}
      <input className="input-field__input" {...props} />
      {rightIcon && (
        <button
          type="button"
          className="input-field__icon input-field__icon--right"
          onClick={onRightIconClick}
          tabIndex={-1}
          aria-label="Toggle field action"
        >
          {rightIcon}
        </button>
      )}
    </div>
  )
}
