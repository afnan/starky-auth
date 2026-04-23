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

export default function Register({ kcContext }: { kcContext: RegisterKcContext }) {
  const { url } = kcContext;
  const ctx = kcContext as RegisterKcContextWithSocial;
  const googleProvider = ctx.social?.providers?.find((p) => p.alias === "google");

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

        <form aria-label="register" method="POST" action={url.registrationAction}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <InputField id="firstName" label="First Name" type="text" name="firstName" placeholder="First name" required />
              <InputField id="lastName" label="Last Name" type="text" name="lastName" placeholder="Last name" required />
            </div>

            <InputField id="email" label="Email Address" type="email" name="email" placeholder="Type email" autoComplete="email" required />

            <InputField id="password" label="Password" type="password" name="password" placeholder="Type password" autoComplete="new-password" required />

            <InputField
              id="businessName"
              label="Business Name (optional)"
              type="text"
              name="user.attributes.businessName"
              placeholder="Your business name"
            />

            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
              <input
                type="checkbox"
                name="termsAccepted"
                required
                aria-label="I agree to the Terms & Conditions"
                style={{ marginTop: "2px", flexShrink: 0 }}
              />
              <span style={{ color: "var(--color-text-mid)" }}>
                I agree to the{" "}
                <a href="#" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Terms & Conditions</a>
              </span>
            </label>
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
