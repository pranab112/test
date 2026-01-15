import { InputHTMLAttributes, forwardRef, useState } from 'react';
import clsx from 'clsx';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = type === 'password';

    return (
      <div className="form-group">
        {label && <label className="label">{label}</label>}
        <div className="relative">
          <input
            ref={ref}
            type={isPasswordField && showPassword ? 'text' : type}
            className={clsx('input', error && 'input-error', isPasswordField && 'pr-10', className)}
            {...props}
          />
          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
            </button>
          )}
        </div>
        {error && <p className="error-message">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
