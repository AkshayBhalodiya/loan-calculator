type AuthFieldProps = {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  hint?: string;
};

export default function AuthField({
  id,
  label,
  type = "text",
  placeholder,
  required,
  minLength,
  value,
  onChange,
  autoComplete,
  hint,
}: AuthFieldProps) {
  return (
    <div className="lw-auth-field">
      <label htmlFor={id} className="lw-auth-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="lw-auth-input"
      />
      {hint ? <p className="lw-auth-hint">{hint}</p> : null}
    </div>
  );
}
