import { useEffect } from "react";
import type { KcContext } from "keycloakify/login/KcContext";
import type { CSSProperties } from "react";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import BackButton from "../components/BackButton";
import ConfirmEmail from "./ConfirmEmail";
import verifiedUrl from "../assets/verified.svg";

type InfoKcContext = Extract<KcContext, { pageId: "info.ftl" }>;

const iconWrapperBase: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
};

const CheckIcon = () => (
  <div data-testid="success-icon" style={iconWrapperBase}>
    <img src={verifiedUrl} alt="" width={63} height={60} />
  </div>
);

const doneButtonStyle: CSSProperties = {
  display: "block",
  textAlign: "center",
  height: "var(--button-height, 48px)",
  lineHeight: "var(--button-height, 48px)",
  backgroundColor: "var(--color-primary)",
  color: "#fff",
  borderRadius: "var(--button-radius, 5px)",
  fontSize: "16px",
  fontWeight: 700,
  textDecoration: "none",
};

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
    if (isEmailSent) return; // ConfirmEmail sets its own title
    const title = isSuccess ? "Password reset · Starky" : "Account · Starky";
    document.title = title;
  }, [isSuccess, isEmailSent]);

  if (isEmailSent) {
    return <ConfirmEmail loginUrl={url.loginUrl} resendUrl={url.loginRestartFlowUrl} />;
  }

  // 0.6 Reset Password – Success: single Done button that returns to Login (0.1).
  // Per spec, the success screen has no Back link and Done always navigates to login,
  // not the OIDC actionUri continuation.
  if (isSuccess) {
    return (
      <AuthBackground>
        <AuthCard>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
            <CheckIcon />
            <div>
              <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", marginBottom: "8px" }}>
                Great
              </h1>
              <p style={{ color: "var(--color-text-mid)" }}>Your password has been reset successfully!</p>
            </div>
          </div>
          <a href={url.loginUrl} style={doneButtonStyle}>
            Done
          </a>
        </AuthCard>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <AuthCard>
        <BackButton href={url.loginUrl} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
          <div>
            <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", marginBottom: "8px" }}>
              {messageHeader ?? "Information"}
            </h1>
            <p style={{ color: "var(--color-text-mid)" }}>{message?.summary ?? ""}</p>
          </div>
        </div>

        <a href={actionUri ?? url.loginUrl} style={doneButtonStyle}>
          Done
        </a>
      </AuthCard>
    </AuthBackground>
  );
}
