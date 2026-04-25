import { useEffect } from "react";
import type { KcContext } from "keycloakify/login/KcContext";
import type { CSSProperties } from "react";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import BackButton from "../components/BackButton";

type InfoKcContext = Extract<KcContext, { pageId: "info.ftl" }>;

const iconWrapperBase: CSSProperties = {
  width: "63px",
  height: "60px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
};

const CheckIcon = () => (
  <div data-testid="success-icon" style={{ ...iconWrapperBase, backgroundColor: "#e8f5e9" }}>
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2.5" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </div>
);

const EnvelopeIcon = () => (
  <div style={{ ...iconWrapperBase, backgroundColor: "#e3f0ff" }}>
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22 4 12 13 2 4" />
    </svg>
  </div>
);

export default function Info({ kcContext }: { kcContext: InfoKcContext }) {
  const { url, messageHeader, message, actionUri } = kcContext;

  // Use message.type for reliable state detection — Keycloak sets this consistently
  // regardless of the messageHeader i18n key which varies across KC versions
  const isSuccess = message?.type === "success";

  // Email sent: no "success" type, but messageHeader contains "email" or summary mentions email
  const summaryLower = (message?.summary ?? "").toLowerCase();
  const headerLower = (messageHeader ?? "").toLowerCase();
  const isEmailSent =
    !isSuccess &&
    (headerLower.includes("email") ||
      summaryLower.includes("email") ||
      summaryLower.includes("shortly"));

  useEffect(() => {
    const title = isSuccess
      ? "Password reset · Starky"
      : isEmailSent
        ? "Check your email · Starky"
        : "Account · Starky";
    document.title = title;
  }, [isSuccess, isEmailSent]);

  return (
    <AuthBackground>
      <AuthCard>
        <BackButton href={url.loginUrl} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
          {isSuccess && <CheckIcon />}
          {isEmailSent && <EnvelopeIcon />}

          <div>
            <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", marginBottom: "8px" }}>
              {isSuccess ? "Great" : isEmailSent ? "Check your email" : (messageHeader ?? "Information")}
            </h1>
            <p style={{ color: "var(--color-text-mid)" }}>
              {isSuccess
                ? "Your password has been reset successfully!"
                : (message?.summary ?? "")}
            </p>
          </div>
        </div>

        <a
          href={actionUri ?? url.loginUrl}
          style={{
            display: "block",
            textAlign: "center",
            height: "var(--button-height, 48px)",
            lineHeight: "var(--button-height, 48px)",
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            borderRadius: "var(--button-radius, 5px)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {isSuccess ? "Back to Login" : "Done"}
        </a>
      </AuthCard>
    </AuthBackground>
  );
}
