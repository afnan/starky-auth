import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { KcContext } from "keycloakify/login/KcContext";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";
import BackButton from "../components/BackButton";
import Divider from "../components/Divider";
import InfoPopover from "../components/InfoPopover";
import { PASSWORD_RULES, getFirstPasswordError } from "../lib/password";

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

// Permissive enough to catch typos (requires "@" and a "."); the server still
// does the authoritative check.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requirementsListStyle: CSSProperties = {
  listStyle: "disc",
  padding: "0 0 0 18px",
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const PasswordRequirements = () => (
  <ul style={requirementsListStyle}>
    {PASSWORD_RULES.map((rule) => (
      <li key={rule.id}>{rule.text}</li>
    ))}
  </ul>
);

export default function Register({ kcContext }: { kcContext: RegisterKcContext }) {
  const { url, messagesPerField, message } = kcContext;
  const ctx = kcContext as RegisterKcContextWithSocial;
  const googleProvider = ctx.social?.providers?.find((p) => p.alias === "google");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    document.title = "Create your account · Starky";
  }, []);

  const trimmedBusinessName = businessName.trim();
  const clientErrors = {
    firstName: firstName.trim() ? undefined : "First name is required",
    lastName: lastName.trim() ? undefined : "Last name is required",
    email: !email.trim()
      ? "Email is required"
      : !EMAIL_REGEX.test(email.trim())
        ? "Enter a valid email address"
        : undefined,
    password: getFirstPasswordError(password, email.trim()),
    businessName:
      trimmedBusinessName.length > 0 && trimmedBusinessName.length < 2
        ? "Business name must be at least 2 characters"
        : undefined,
    terms: termsAccepted ? undefined : "You must accept the Terms & Conditions",
  };

  const isFormValid = Object.values(clientErrors).every((err) => !err);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!isFormValid) {
      e.preventDefault();
      setSubmitAttempted(true);
    }
  };

  const errorFor = (field: string) =>
    messagesPerField.existsError(field) ? messagesPerField.get(field) : undefined;

  // Server-side errors win; otherwise after a failed submit, surface the
  // client-side message so the user sees one corrective hint per field.
  const firstNameError = errorFor("firstName") ?? (submitAttempted ? clientErrors.firstName : undefined);
  const lastNameError = errorFor("lastName") ?? (submitAttempted ? clientErrors.lastName : undefined);
  const emailError = errorFor("email") ?? (submitAttempted ? clientErrors.email : undefined);

  const serverPasswordError = messagesPerField.existsError("password", "password-confirm")
    ? messagesPerField.getFirstError("password", "password-confirm")
    : undefined;
  const passwordError =
    serverPasswordError ?? (submitAttempted ? clientErrors.password : undefined);
  const businessNameError = submitAttempted ? clientErrors.businessName : undefined;
  const termsError = errorFor("termsAccepted") ?? (submitAttempted ? clientErrors.terms : undefined);

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

        <form aria-label="register" method="POST" action={url.registrationAction} onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <InputField
                id="firstName"
                label="First Name"
                type="text"
                name="firstName"
                placeholder="Type first name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={firstNameError}
              />
              <InputField
                id="lastName"
                label="Last Name"
                type="text"
                name="lastName"
                placeholder="Type last name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={lastNameError}
              />
            </div>

            <InputField
              id="email"
              label="Email Address"
              type="email"
              name="email"
              placeholder="Type email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
            />

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
              labelExtra={
                <InfoPopover triggerLabel="Show password requirements">
                  <PasswordRequirements />
                </InfoPopover>
              }
            />
            <input type="hidden" name="password-confirm" value={password} />

            <InputField
              id="businessName"
              label="Business Name (optional)"
              type="text"
              name="user.attributes.businessName"
              placeholder="Type business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              error={businessNameError}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="termsAccepted"
                  required
                  aria-label="I agree to the Terms & Conditions"
                  aria-invalid={termsError ? "true" : undefined}
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
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
