import { useEffect } from "react";
import type { KcContext } from "keycloakify/login/KcContext";
import type { CSSProperties } from "react";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import BackButton from "../components/BackButton";

type UpdatePasswordKcContext = Extract<KcContext, { pageId: "login-update-password.ftl" }>;

const errorBannerStyle: CSSProperties = {
  padding: "12px 16px",
  backgroundColor: "#fff5f5",
  border: "1px solid #fed7d7",
  borderRadius: "var(--input-radius, 5px)",
  color: "var(--color-error, #dc3545)",
  fontSize: "14px",
  lineHeight: "1.5",
};

export default function UpdatePassword({ kcContext }: { kcContext: UpdatePasswordKcContext }) {
  const { url, messagesPerField, message } = kcContext;

  useEffect(() => {
    document.title = "Set a new password · Starky";
  }, []);

  const newPasswordError = messagesPerField.existsError("password-new", "password-confirm")
    ? messagesPerField.get("password-new")
    : undefined;

  const confirmPasswordError = messagesPerField.existsError("password-confirm")
    ? messagesPerField.get("password-confirm")
    : undefined;

  return (
    <AuthBackground>
      <AuthCard>
        <BackButton href={url.loginUrl} />

        <div>
          <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", lineHeight: "32px", marginBottom: "8px" }}>
            Create New Password
          </h1>
          <p style={{ color: "var(--color-text-mid)", lineHeight: "20px" }}>Enter your new password to complete the reset</p>
        </div>

        {message && message.type === "error" && !messagesPerField.existsError("password-new", "password-confirm") && (
          <div style={errorBannerStyle}>{message.summary}</div>
        )}

        <form aria-label="update-password" method="POST" action={url.loginAction}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <InputField
              id="password-new"
              label="New Password"
              type="password"
              name="password-new"
              placeholder="Type new password"
              autoComplete="new-password"
              required
              error={newPasswordError}
            />
            <InputField
              id="password-confirm"
              label="Confirm Password"
              type="password"
              name="password-confirm"
              placeholder="Re-type password"
              autoComplete="new-password"
              required
              error={confirmPasswordError}
            />
          </div>

          <div style={{ marginTop: "30px" }}>
            <PrimaryButton type="submit">Update Password</PrimaryButton>
          </div>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
