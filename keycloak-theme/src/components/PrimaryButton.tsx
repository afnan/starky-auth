import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  type?: "submit" | "button";
  disabled?: boolean;
  onClick?: () => void;
};

const baseStyle: CSSProperties = {
  width: "100%",
  height: "var(--button-height, 48px)",
  backgroundColor: "var(--color-primary, #007bff)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--button-radius, 5px)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

export default function PrimaryButton({ children, type = "submit", disabled, onClick }: Props) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...baseStyle,
        backgroundColor: disabled ? "#6c757d" : "var(--color-primary, #007bff)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
