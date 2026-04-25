import type { CSSProperties, ReactNode } from "react";

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "var(--card-width, 482px)",
  backgroundColor: "var(--color-surface, #fff)",
  borderRadius: "var(--card-radius, 10px)",
  padding: "var(--card-padding, 20px)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

export default function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="auth-card" style={cardStyle}>
      {children}
    </div>
  );
}
