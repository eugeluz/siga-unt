import React from 'react';

interface FormFieldProps {
  label: string;
  id?: string;
  type?: string;
  value: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

/**
 * Reusable FormField component.
 * Applies DRY by unifying input and select styling/structure,
 * and KISS by keeping props straightforward.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder,
  options
}) => {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select
          id={id}
          className="form-control"
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
        >
          {options.map((opt, i) => (
            <option key={i} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          className="form-control"
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};
