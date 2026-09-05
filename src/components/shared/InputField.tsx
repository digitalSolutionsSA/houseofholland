import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import './InputField.css'

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  onRightIconClick?: () => void
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField({
  leftIcon,
  rightIcon,
  onRightIconClick,
  className = '',
  ...props
}, ref) {
  return (
    <div className={`input-field ${className}`}>
      {leftIcon && <span className="input-field__icon input-field__icon--left">{leftIcon}</span>}
      <input ref={ref} className="input-field__input" {...props} />
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
})
