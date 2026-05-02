import { useEffect } from "react";
import type { CSSProperties } from "react";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import BackButton from "../components/BackButton";

type Props = {
  loginUrl: string;
  resendUrl: string;
};

const cardOverrideStyle: CSSProperties = {
  gap: "30px",
};

const contentBlockStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  width: "100%",
};

const titleGroupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const titleStyle: CSSProperties = {
  fontSize: "30px",
  lineHeight: "32px",
  fontWeight: 700,
  color: "var(--color-text-dark, #0e121b)",
  margin: 0,
};

const descriptionStyle: CSSProperties = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "var(--color-text-mid, #525866)",
  margin: 0,
};

const resendButtonStyle: CSSProperties = {
  width: "100%",
  height: "var(--button-height, 48px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff",
  border: "1px solid var(--color-primary, #007bff)",
  borderRadius: "var(--button-radius, 5px)",
  color: "var(--color-primary, #007bff)",
  fontSize: "16px",
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
};

export default function ConfirmEmail({ loginUrl, resendUrl }: Props) {
  useEffect(() => {
    document.title = "Check your email · Starky";
  }, []);

  return (
    <AuthBackground>
      <AuthCard style={cardOverrideStyle}>
        <BackButton href={loginUrl} />
        <div style={contentBlockStyle}>
          <div style={titleGroupStyle}>
            <h1 style={titleStyle}>Confirm Email</h1>
            <p style={descriptionStyle}>A password reset link has been sent to your email address</p>
          </div>
          <a href={resendUrl} style={resendButtonStyle}>
            Didn&rsquo;t Receive The Link? Send Again
          </a>
        </div>
      </AuthCard>
    </AuthBackground>
  );
}
