import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { KcContext } from "keycloakify/login/KcContext";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";
import BackButton from "../components/BackButton";
import Divider from "../components/Divider";

type RegisterKcContext = Extract<KcContext, { pageId: "register.ftl" }>;

// Keycloakify v11's register.ftl type doesn't declare social, but KC provides it at runtime
type RegisterKcContextWithSocial = RegisterKcContext & {
  social?: {
    providers?: Array<{ alias: string; displayName: string; loginUrl: string; providerId: string }>;
  };
};

const errorBannerStyle: CSSProperties = {
  padding: "12px 16px",
  backgroundColor: "#fff5f5",
  border: "1px solid #fed7d7",
  borderRadius: "var(--input-radius, 5px)",
  color: "var(--color-error, #dc3545)",
  fontSize: "14px",
  lineHeight: "1.5",
};

const FIELD_NAMES = ["firstName", "lastName", "email", "password", "password-confirm", "termsAccepted"] as const;

export default function Register({ kcContext }: { kcContext: RegisterKcContext }) {
  const { url, messagesPerField, message } = kcContext;
  const ctx = kcContext as RegisterKcContextWithSocial;
  const googleProvider = ctx.social?.providers?.find((p) => p.alias === "google");

  const [password, setPassword] = useState("");
  const passwordRules = [
    { text: "At least 8 characters", pass: password.length >= 8 },
    { text: "Contains a digit", pass: /\d/.test(password) },
    { text: "Contains an uppercase letter", pass: /[A-Z]/.test(password) },
  ];

  useEffect(() => {
    document.title = "Create your account · Starky";
  }, []);

  const errorFor = (field: string) =>
    messagesPerField.existsError(field) ? messagesPerField.get(field) : undefined;

  const firstNameError = errorFor("firstName");
  const lastNameError = errorFor("lastName");
  const emailError = errorFor("email");
  const passwordError = messagesPerField.existsError("password", "password-confirm")
    ? messagesPerField.getFirstError("password", "password-confirm")
    : undefined;
  const termsError = errorFor("termsAccepted");

  const showGlobalError =
    message?.type === "error" && !messagesPerField.existsError(...FIELD_NAMES);

  return (
    <AuthBackground>
      <AuthCard>
        <BackButton href={url.loginUrl} />

        <div>
          <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", marginBottom: "4px" }}>
            Create Account
          </h1>
          <p style={{ color: "var(--color-text-mid)" }}>Fill the details to create your account</p>
        </div>

        {showGlobalError && <div style={errorBannerStyle}>{message!.summary}</div>}

        <form aria-label="register" method="POST" action={url.registrationAction}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <InputField id="firstName" label="First Name" type="text" name="firstName" placeholder="First name" required error={firstNameError} />
              <InputField id="lastName" label="Last Name" type="text" name="lastName" placeholder="Last name" required error={lastNameError} />
            </div>

            <InputField id="email" label="Email Address" type="email" name="email" placeholder="Type email" autoComplete="email" required error={emailError} />

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <InputField
                id="password"
                label="Password"
                type="password"
                name="password"
                placeholder="Type password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={passwordError}
              />
              <input type="hidden" name="password-confirm" value={password} />
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                {passwordRules.map((rule) => {
                  const color = password === ""
                    ? "var(--color-text-mid, #6b7280)"
                    : rule.pass
                      ? "#16a34a"
                      : "var(--color-error, #dc3545)";
                  return (
                    <li
                      key={rule.text}
                      style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color }}
                    >
                      <span aria-hidden="true">{rule.pass ? "✓" : "•"}</span>
                      <span>{rule.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <InputField
              id="businessName"
              label="Business Name (optional)"
              type="text"
              name="user.attributes.businessName"
              placeholder="Your business name"
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="termsAccepted"
                  required
                  aria-label="I agree to the Terms & Conditions"
                  aria-invalid={termsError ? "true" : undefined}
                  style={{ marginTop: "2px", flexShrink: 0 }}
                />
                <span style={{ color: "var(--color-text-mid)" }}>
                  I agree to the{" "}
                  <a href="#" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Terms & Conditions</a>
                </span>
              </label>
              {termsError && (
                <span style={{ fontSize: "12px", color: "var(--color-error, #dc3545)" }}>{termsError}</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            <PrimaryButton type="submit">Create Account</PrimaryButton>
          </div>
        </form>

        {googleProvider && (
          <>
            <Divider />
            <GoogleButton href={googleProvider.loginUrl} />
          </>
        )}

        <p style={{ textAlign: "center", fontSize: "14px", color: "var(--color-text-mid)" }}>
          Already have an account?{" "}
          <a href={url.loginUrl} style={{ color: "var(--color-primary)", fontWeight: 600 }}>Login</a>
        </p>
      </AuthCard>
    </AuthBackground>
  );
}
