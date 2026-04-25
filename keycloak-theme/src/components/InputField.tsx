import { useState } from "react";
import type { CSSProperties } from "react";

type Props = {
  id: string;
  label: string;
  type: "text" | "email" | "password";
  name: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  required?: boolean;
};

const wrapperStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const labelStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--color-text-dark, #0e121b)",
};

const inputWrapperStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const baseInputStyle: CSSProperties = {
  width: "100%",
  height: "var(--input-height, 48px)",
  border: "1px solid var(--color-border, #e1e4ea)",
  borderRadius: "var(--input-radius, 5px)",
  padding: "8px 16px",
  fontSize: "14px",
  color: "var(--color-text-dark, #0e121b)",
  outline: "none",
  backgroundColor: "#fff",
};

const errorStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-error, #dc3545)",
};

const EyeOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function InputField({
  id,
  label,
  type,
  name,
  defaultValue,
  placeholder,
  autoComplete,
  error,
  required,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <div style={wrapperStyle}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div style={inputWrapperStyle}>
        <input
          id={id}
          name={name}
          type={resolvedType}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          style={{
            ...baseInputStyle,
            paddingRight: isPassword ? "44px" : "16px",
            borderColor: error ? "var(--color-error, #dc3545)" : "var(--color-border, #e1e4ea)",
          }}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute",
              right: "12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-light, #929292)",
              display: "flex",
              alignItems: "center",
              padding: 0,
            }}
          >
            {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </button>
        )}
      </div>
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  );
}
