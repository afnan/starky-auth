import { useEffect } from "react";
import type { CSSProperties } from "react";
import type { KcContext } from "keycloakify/login/KcContext";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";
import Divider from "../components/Divider";

type LoginKcContext = Extract<KcContext, { pageId: "login.ftl" }>;

const errorBannerStyle: CSSProperties = {
  padding: "12px 16px",
  backgroundColor: "#fff5f5",
  border: "1px solid #fed7d7",
  borderRadius: "var(--input-radius, 5px)",
  color: "var(--color-error, #dc3545)",
  fontSize: "14px",
  lineHeight: "1.5",
};

export default function Login({ kcContext }: { kcContext: LoginKcContext }) {
  const { url, realm, social, login, messagesPerField, message } = kcContext;
  const googleProvider = social?.providers?.find((p) => p.alias === "google");

  useEffect(() => {
    document.title = "Sign in · Starky";
  }, []);

  const usernameError = messagesPerField.existsError("username")
    ? messagesPerField.get("username")
    : undefined;
  const passwordError = messagesPerField.existsError("password")
    ? messagesPerField.get("password")
    : undefined;

  const showGlobalError =
    message?.type === "error" && !messagesPerField.existsError("username", "password");

  return (
    <AuthBackground>
      <AuthCard>
        <div>
          <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", marginBottom: "4px" }}>
            Login
          </h1>
          <p style={{ color: "var(--color-text-mid)" }}>Login to your account</p>
        </div>

        {showGlobalError && <div style={errorBannerStyle}>{message!.summary}</div>}

        <form aria-label="login" method="POST" action={url.loginAction}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <InputField
              id="username"
              label="Email Address"
              type="email"
              name="username"
              defaultValue={login.username ?? ""}
              placeholder="Type email"
              autoComplete="email"
              required
              error={usernameError}
            />
            <InputField
              id="password"
              label="Password"
              type="password"
              name="password"
              placeholder="Type password"
              autoComplete="current-password"
              required
              error={passwordError}
            />
          </div>

          {realm.resetPasswordAllowed && (
            <div style={{ textAlign: "right", marginTop: "8px" }}>
              <a href={url.loginResetCredentialsUrl} style={{ fontSize: "14px", color: "var(--color-primary)" }}>
                Forgot Password?
              </a>
            </div>
          )}

          <div style={{ marginTop: "24px" }}>
            <PrimaryButton type="submit">Login</PrimaryButton>
          </div>
        </form>

        {googleProvider && (
          <>
            <Divider />
            <GoogleButton href={googleProvider.loginUrl} />
          </>
        )}

        {realm.registrationAllowed && (
          <p style={{ textAlign: "center", fontSize: "14px", color: "var(--color-text-mid)" }}>
            Don't have an account?{" "}
            <a href={url.registrationUrl} style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              Create an account
            </a>
          </p>
        )}
      </AuthCard>
    </AuthBackground>
  );
}
