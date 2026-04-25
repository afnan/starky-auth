import { useEffect } from "react";
import type { KcContext } from "keycloakify/login/KcContext";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";
import Divider from "../components/Divider";

type LoginKcContext = Extract<KcContext, { pageId: "login.ftl" }>;

export default function Login({ kcContext }: { kcContext: LoginKcContext }) {
  const { url, realm, social, login } = kcContext;
  const googleProvider = social?.providers?.find((p) => p.alias === "google");

  useEffect(() => {
    document.title = "Sign in · Starky";
  }, []);

  return (
    <AuthBackground>
      <AuthCard>
        <div>
          <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", marginBottom: "4px" }}>
            Login
          </h1>
          <p style={{ color: "var(--color-text-mid)" }}>Login to your account</p>
        </div>

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
            />
            <InputField
              id="password"
              label="Password"
              type="password"
              name="password"
              placeholder="Type password"
              autoComplete="current-password"
              required
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
