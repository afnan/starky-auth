# Keycloak Theme Design — Starky App

**Date:** 2026-04-22  
**Branch:** keycloak_theme 
**Status:** Approved

---

## Context

Starky's authentication is entirely handled by Keycloak (v26.5.5, Docker, `quay.io/keycloak/keycloak:26.5.5`) at `https://auth.allspicetech.com.au`. The frontend redirects users to Keycloak's hosted login UI for all auth flows (login, register, password reset, MFA). Currently this shows Keycloak's default theme — which does not match the Starky brand or Figma designs.

The goal is to replace the default Keycloak login theme with a pixel-perfect implementation of the Figma screens (Starky App — Google MVP, file `f8WGylnqdP155CdxEPjlJl`), deployed as a JAR to the `keycloak-server` Docker container.

---

## Approach

**Keycloakify v25 + React + Vite**, packaged as a `.jar` and deployed via `docker cp` to `/opt/keycloak/providers/`.

Keycloakify is chosen over traditional FreeMarker templates because:
- Full React component model → pixel-perfect fidelity to Figma with reusable components
- Hot-reload dev preview (Storybook-style) without needing a live Keycloak instance
- JAR deployment is what KC26's provider system is designed for — clean, one-file deploy
- FTL templates require Keycloak restarts for every CSS change and are verbose/error-prone

The theme registers as a named login theme (`starky`) and is applied per-realm: Keycloak Admin → Realm Settings → Themes → Login Theme → `starky`. Other realms are unaffected.

---

## Repository Structure

New sub-project added at the repo root:

```
starky-frontend/
├── app/                          ← existing Nuxt app (no changes)
├── keycloak-theme/               ← new sub-project
│   ├── package.json              ← Keycloakify v25, React 18, Vite, TypeScript
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx              ← Keycloakify entrypoint (getKcContextMock / renderApp)
│   │   ├── KcPage.tsx            ← routes KC page IDs to React page components
│   │   ├── pages/
│   │   │   ├── Login.tsx         ← 0.1 Login (Figma node 1:8626)
│   │   │   ├── Register.tsx      ← 0.2 Create Account (Figma node 1:9811)
│   │   │   ├── ResetPassword.tsx ← 0.3 Reset Password email input (Figma node 1:10062)
│   │   │   ├── Info.tsx          ← 0.4 email sent confirmation + 0.6 Success (Figma nodes 1:10434, 1:10406)
│   │   │   ├── UpdatePassword.tsx← 0.5 Create New Password (Figma node 1:10150)
│   │   │   └── LoginOtp.tsx      ← MFA verification (designed to match style)
│   │   ├── components/
│   │   │   ├── AuthCard.tsx      ← card wrapper: 482px, 10px radius, 20px padding, shadow
│   │   │   ├── AuthBackground.tsx← gradient background with circular overlays
│   │   │   ├── InputField.tsx    ← label + input + optional eye-toggle icon
│   │   │   ├── PrimaryButton.tsx ← full-width, 48px, #007BFF, white text
│   │   │   ├── GoogleButton.tsx  ← "Continue with Google" secondary button
│   │   │   ├── BackButton.tsx    ← arrow icon + "Back" label
│   │   │   └── Divider.tsx       ← "or continue with" horizontal divider
│   │   └── styles/
│   │       ├── tokens.css        ← CSS custom properties for design tokens
│   │       └── global.css        ← Inter font import, box-sizing reset
│   └── dist_keycloak/            ← gitignored build output
│       └── starky-theme-*.jar
```

---

## Design Tokens

Sourced from Figma file (section 0.x auth screens):

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#007BFF` | Buttons, links, focus rings |
| `--color-text-dark` | `#0E121B` | Headings |
| `--color-text-mid` | `#525866` | Body, descriptions |
| `--color-text-light` | `#929292` | Placeholders, secondary |
| `--color-border` | `#E1E4EA` | Input borders, dividers |
| `--color-surface` | `#FFFFFF` | Card background |
| `--font-family` | `Inter` | All text (Google Fonts CDN) |
| `--card-width` | `482px` | Auth card max-width |
| `--card-radius` | `10px` | Card border-radius |
| `--card-padding` | `20px` | Card inner padding |
| `--input-height` | `48px` | All input fields |
| `--input-radius` | `5px` | Input border-radius |
| `--button-height` | `48px` | Primary + Google buttons |
| `--button-radius` | `5px` | Button border-radius |

---

## Screens

### Login (0.1) — `login.tsx`
- Figma node: `1:8626`
- Elements: heading "Login", subheading "Login to your account", email input, password input (eye toggle), "Forgot Password?" link, primary "Login" button, "or continue with" divider, Google OAuth button, "Don't have an account? Create an account" footer link
- Keycloakify props: `kcContext.realm.registrationAllowed`, `kcContext.social.providers` (Google), `kcContext.url.loginAction`

### Create Account (0.2) — `register.tsx`
- Figma node: `1:9811`
- Elements: back button, heading "Create Account", subheading, first name + last name (2-col), email, password (eye toggle), business name (optional), T&C checkbox, "Create Account" button, Google OAuth, "Already have an account? Login" footer
- Keycloakify props: `kcContext.url.registrationAction`, `kcContext.passwordRequired`, `kcContext.recaptchaRequired`
- **Note:** Business name is a custom user attribute — requires adding a `businessName` user profile attribute in Keycloak Admin (Realm Settings → User Profile) before it will appear in `kcContext.profile.attributesByName`

### Reset Password — Email Input (0.3) — `login-reset-password.tsx`
- Figma node: `1:10062`
- Elements: back button, heading "Reset Password", subheading, email input, "Send Reset Link" button
- Keycloakify props: `kcContext.url.loginAction`

### Reset Password — Email Sent (0.4) + Success (0.6) — `info.tsx`
- Figma nodes: `1:10434` (email sent, not yet extracted), `1:10406` (success)
- KC routes both states through its `info.tsx` page with different `messageHeader`/`message` values — the component detects state and renders accordingly
- Email Sent elements: envelope icon, heading "Check your email", subheading with user's email
- Success elements: green checkmark badge (62.7×60.2px), heading "Great", subheading "Your password has been reset successfully!", "Done" button

### Create New Password (0.5) — `login-update-password.tsx`
- Figma node: `1:10150`
- Elements: back button, heading "Create New Password", subheading, new password input (eye toggle), confirm password input (eye toggle), "Update Password" button
- Keycloakify props: `kcContext.url.loginAction`, `kcContext.isAppInitiatedAction`

### MFA / OTP Verification — `login-otp.tsx`
- Designed from scratch to match existing card style
- Elements: heading "Verify your identity", subheading "Enter the code from your authenticator app", 6-digit OTP input (single `<input>` for KC form compatibility), "Verify" button, "Use a different method" link
- Keycloakify props: `kcContext.otpLogin.userOtpCredentials`, `kcContext.url.loginAction`

---

## Deployment

### Build
```bash
cd keycloak-theme
npm install
npm run build
# Outputs: dist_keycloak/starky-theme-<version>.jar
```

### Deploy to Docker
```bash
docker cp dist_keycloak/starky-theme-<version>.jar keycloak-server:/opt/keycloak/providers/
docker restart keycloak-server
```

### Activate in Keycloak Admin
1. Log in to Keycloak admin at `https://auth.allspicetech.com.au`
2. Select realm `starky-dev`
3. Realm Settings → Themes → Login Theme → select `starky`
4. Save

### Local Development (no Keycloak needed)
Keycloakify provides a Storybook-style mock runtime:
```bash
cd keycloak-theme
npm run dev
# Opens browser with all pages rendered using mock KC context
```

---

## Verification

1. `npm run build` completes without errors and produces a `.jar`
2. After deploying JAR and restarting, navigate to `https://auth.allspicetech.com.au/realms/starky-dev/account` — login page should show the Starky theme
3. Walk through each flow end-to-end from `http://localhost:3000`:
   - Login with email/password
   - Login with Google
   - Register new account
   - Forgot password → receive email → reset password → success screen
   - Login with MFA enabled account → OTP screen appears
4. Visual check: card width (482px), Inter font, primary blue (#007BFF) buttons, no Keycloak default styles visible
5. Mobile check: card should stack/scale on smaller viewports
