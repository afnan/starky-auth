import type { KcContext } from "keycloakify/login/KcContext";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import BackButton from "../components/BackButton";

type ResetPasswordKcContext = Extract<KcContext, { pageId: "login-reset-password.ftl" }>;

export default function ResetPassword({ kcContext }: { kcContext: ResetPasswordKcContext }) {
  const { url } = kcContext;

  return (
    <AuthBackground>
      <AuthCard>
        <BackButton href={url.loginUrl} />

        <div>
          <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", marginBottom: "4px" }}>
            Reset Password
          </h1>
          <p style={{ color: "var(--color-text-mid)" }}>Enter your email address to receive a reset link</p>
        </div>

        <form aria-label="reset-password" method="POST" action={url.loginAction}>
          <InputField
            id="username"
            label="Email Address"
            type="email"
            name="username"
            placeholder="Type email"
            autoComplete="email"
            required
          />
          <div style={{ marginTop: "24px" }}>
            <PrimaryButton type="submit">Send Reset Link</PrimaryButton>
          </div>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
