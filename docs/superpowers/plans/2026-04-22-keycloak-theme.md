# Keycloak Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pixel-perfect Keycloak login theme matching Starky's Figma designs and deploy it as a JAR to the KC 26.5.5 Docker container (`keycloak-server`).

**Architecture:** A standalone `keycloak-theme/` sub-project at the repo root using Keycloakify v25 + React 18 + Vite. Keycloakify's Vite plugin compiles React components into a `.jar` that Keycloak's provider system loads. The JAR is deployed via `docker cp` to the running `keycloak-server` container, then activated per-realm through Keycloak Admin UI.

**Tech Stack:** keycloakify ^25, React 18, TypeScript 5, Vite 5, Vitest, @testing-library/react, plain CSS with custom properties (no Tailwind — keeps the JAR lean)

**Spec:** `docs/superpowers/specs/2026-04-22-keycloak-theme-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `keycloak-theme/package.json` | Sub-project deps + Keycloakify build config (`themeName: "starky"`) |
| `keycloak-theme/tsconfig.json` | TypeScript config |
| `keycloak-theme/vite.config.ts` | Vite + Keycloakify plugin (build only) |
| `keycloak-theme/vitest.config.ts` | Vitest config (separate from vite.config — avoids Keycloakify plugin conflict in test runner) |
| `keycloak-theme/index.html` | Vite dev entrypoint (replaced by KC template at build time) |
| `keycloak-theme/src/test-setup.ts` | `@testing-library/jest-dom` matchers setup |
| `keycloak-theme/src/main.tsx` | App entrypoint — bootstraps real or mock KC context |
| `keycloak-theme/src/KcPage.tsx` | Routes `kcContext.pageId` to page components; falls back to Keycloakify default |
| `keycloak-theme/src/styles/tokens.css` | All CSS custom properties from Figma design tokens |
| `keycloak-theme/src/styles/global.css` | Inter font CDN import + box-sizing reset |
| `keycloak-theme/src/components/AuthBackground.tsx` | Full-viewport gradient background with radial overlays |
| `keycloak-theme/src/components/AuthCard.tsx` | 482px white card with drop shadow — wraps all page content |
| `keycloak-theme/src/components/InputField.tsx` | Labeled input with optional password eye-toggle |
| `keycloak-theme/src/components/PrimaryButton.tsx` | Full-width 48px #007BFF submit button |
| `keycloak-theme/src/components/GoogleButton.tsx` | Google OAuth button (secondary style) |
| `keycloak-theme/src/components/BackButton.tsx` | Arrow icon + "Back" label |
| `keycloak-theme/src/components/Divider.tsx` | "or continue with" horizontal divider |
| `keycloak-theme/src/pages/Login.tsx` | 0.1 Login — email, password, Google, forgot password link |
| `keycloak-theme/src/pages/Register.tsx` | 0.2 Create Account — names, email, password, business name, T&C |
| `keycloak-theme/src/pages/ResetPassword.tsx` | 0.3 Reset Password — email input + send link |
| `keycloak-theme/src/pages/UpdatePassword.tsx` | 0.5 Create New Password — new + confirm fields |
| `keycloak-theme/src/pages/Info.tsx` | 0.4 email sent + 0.6 success — dispatches on `messageHeader` |
| `keycloak-theme/src/pages/LoginOtp.tsx` | MFA OTP verification screen |
| `keycloak-theme/src/__tests__/components/AuthCard.test.tsx` | Renders children inside card |
| `keycloak-theme/src/__tests__/components/InputField.test.tsx` | Label, input, eye-toggle behaviour |
| `keycloak-theme/src/__tests__/pages/Login.test.tsx` | Form action, heading, Google button visibility |
| `keycloak-theme/src/__tests__/pages/Register.test.tsx` | All fields present, form action |
| `keycloak-theme/src/__tests__/pages/ResetPassword.test.tsx` | Email field + button |
| `keycloak-theme/src/__tests__/pages/UpdatePassword.test.tsx` | Two password fields + button |
| `keycloak-theme/src/__tests__/pages/Info.test.tsx` | State dispatch (email sent vs success) |
| `keycloak-theme/src/__tests__/pages/LoginOtp.test.tsx` | OTP input + verify button |

---

### Task 1: Bootstrap the Keycloakify sub-project

**Files:**
- Create: `keycloak-theme/package.json`
- Create: `keycloak-theme/tsconfig.json`
- Create: `keycloak-theme/vite.config.ts`
- Create: `keycloak-theme/vitest.config.ts`
- Create: `keycloak-theme/index.html`
- Create: `keycloak-theme/src/test-setup.ts`

- [ ] **Step 1: Create `keycloak-theme/package.json`**

```json
{
  "name": "starky-keycloak-theme",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keycloakify": {
    "themeName": "starky",
    "keycloakVersionTargets": {
      "hasAccountTheme": false,
      "loginThemeResourcesFromKeycloakVersion": "26.5.5"
    }
  },
  "dependencies": {
    "keycloakify": "^25.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Create `keycloak-theme/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `keycloak-theme/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { keycloakify } from "keycloakify/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    keycloakify({
      accountThemeImplementation: "none"
    })
  ]
});
```

- [ ] **Step 4: Create `keycloak-theme/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true
  }
});
```

- [ ] **Step 5: Create `keycloak-theme/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Starky Keycloak Theme</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `keycloak-theme/src/test-setup.ts`**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 7: Install dependencies**

```bash
cd keycloak-theme
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 8: Verify project structure compiles**

```bash
cd keycloak-theme
npx tsc --noEmit
```

Expected: no TypeScript errors (only type-checking, no output files).

- [ ] **Step 9: Commit**

```bash
git add keycloak-theme/
git commit -m "feat(keycloak-theme): bootstrap Keycloakify v25 sub-project"
```

---

### Task 2: Design tokens and global styles

**Files:**
- Create: `keycloak-theme/src/styles/tokens.css`
- Create: `keycloak-theme/src/styles/global.css`

- [ ] **Step 1: Create `keycloak-theme/src/styles/tokens.css`**

```css
:root {
  --color-primary: #007bff;
  --color-primary-hover: #0069d9;
  --color-text-dark: #0e121b;
  --color-text-mid: #525866;
  --color-text-light: #929292;
  --color-border: #e1e4ea;
  --color-surface: #ffffff;
  --color-success: #28a745;
  --color-error: #dc3545;

  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  --card-width: 482px;
  --card-radius: 10px;
  --card-padding: 20px;

  --input-height: 48px;
  --input-radius: 5px;
  --input-padding-x: 16px;

  --button-height: 48px;
  --button-radius: 5px;

  --gap-xs: 4px;
  --gap-sm: 8px;
  --gap-md: 16px;
  --gap-lg: 24px;
  --gap-xl: 30px;
}
```

- [ ] **Step 2: Create `keycloak-theme/src/styles/global.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import './tokens.css';

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  font-size: 14px;
  color: var(--color-text-mid);
  line-height: 1.5;
}

input, button {
  font-family: inherit;
  font-size: inherit;
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 3: Commit**

```bash
git add keycloak-theme/src/styles/
git commit -m "feat(keycloak-theme): add design tokens and global styles from Figma"
```

---

### Task 3: AuthBackground and AuthCard components

**Files:**
- Create: `keycloak-theme/src/components/AuthBackground.tsx`
- Create: `keycloak-theme/src/components/AuthCard.tsx`
- Create: `keycloak-theme/src/__tests__/components/AuthCard.test.tsx`

- [ ] **Step 1: Write the failing test**

`keycloak-theme/src/__tests__/components/AuthCard.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import AuthCard from "../../components/AuthCard";

describe("AuthCard", () => {
  it("renders children inside the card", () => {
    render(<AuthCard><p>hello</p></AuthCard>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("applies card styles via className", () => {
    const { container } = render(<AuthCard><span /></AuthCard>);
    expect(container.firstChild).toHaveClass("auth-card");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../../components/AuthCard'`

- [ ] **Step 3: Create `keycloak-theme/src/components/AuthBackground.tsx`**

```tsx
import "../styles/global.css";
import type { ReactNode } from "react";

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    backgroundColor: "#eef3ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: "24px",
  },
  blobTopLeft: {
    position: "absolute",
    top: "-180px",
    left: "-180px",
    width: "550px",
    height: "550px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(0,123,255,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: "-180px",
    right: "-180px",
    width: "550px",
    height: "550px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(0,123,255,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
  },
};

export default function AuthBackground({ children }: { children: ReactNode }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.blobTopLeft} />
      <div style={styles.blobBottomRight} />
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Create `keycloak-theme/src/components/AuthCard.tsx`**

```tsx
import type { ReactNode } from "react";

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "var(--card-width, 482px)",
  backgroundColor: "var(--color-surface, #fff)",
  borderRadius: "var(--card-radius, 10px)",
  padding: "var(--card-padding, 20px)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

export default function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="auth-card" style={cardStyle}>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: PASS — both AuthCard tests green.

- [ ] **Step 6: Commit**

```bash
git add keycloak-theme/src/components/AuthBackground.tsx keycloak-theme/src/components/AuthCard.tsx keycloak-theme/src/__tests__/components/AuthCard.test.tsx
git commit -m "feat(keycloak-theme): add AuthBackground and AuthCard layout components"
```

---

### Task 4: InputField component

**Files:**
- Create: `keycloak-theme/src/components/InputField.tsx`
- Create: `keycloak-theme/src/__tests__/components/InputField.test.tsx`

- [ ] **Step 1: Write the failing test**

`keycloak-theme/src/__tests__/components/InputField.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InputField from "../../components/InputField";

describe("InputField", () => {
  it("renders label and input", () => {
    render(<InputField id="email" label="Email Address" type="email" name="email" />);
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
  });

  it("shows eye-toggle button for password type", () => {
    render(<InputField id="pw" label="Password" type="password" name="password" />);
    expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument();
  });

  it("toggles password visibility on eye button click", async () => {
    const user = userEvent.setup();
    render(<InputField id="pw" label="Password" type="password" name="password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(input).toHaveAttribute("type", "text");
  });

  it("does not show eye-toggle for non-password type", () => {
    render(<InputField id="email" label="Email" type="email" name="email" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("displays error message when error prop provided", () => {
    render(<InputField id="email" label="Email" type="email" name="email" error="Invalid email" />);
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../../components/InputField'`

- [ ] **Step 3: Create `keycloak-theme/src/components/InputField.tsx`**

```tsx
import { useState } from "react";

type Props = {
  id: string;
  label: string;
  type: "text" | "email" | "password";
  name: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  required?: boolean;
};

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--color-text-dark, #0e121b)",
};

const inputWrapperStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "var(--input-height, 48px)",
  border: "1px solid var(--color-border, #e1e4ea)",
  borderRadius: "var(--input-radius, 5px)",
  padding: "8px 16px",
  fontSize: "14px",
  color: "var(--color-text-dark, #0e121b)",
  outline: "none",
  backgroundColor: "#fff",
};

const errorStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-error, #dc3545)",
};

export default function InputField({
  id,
  label,
  type,
  name,
  defaultValue,
  placeholder,
  autoComplete,
  error,
  required,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <div style={wrapperStyle}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div style={inputWrapperStyle}>
        <input
          id={id}
          name={name}
          type={resolvedType}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          style={{
            ...inputStyle,
            paddingRight: isPassword ? "44px" : "16px",
            borderColor: error ? "var(--color-error, #dc3545)" : "var(--color-border, #e1e4ea)",
          }}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute",
              right: "12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-light, #929292)",
              display: "flex",
              alignItems: "center",
              padding: 0,
            }}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: PASS — all 5 InputField tests green.

- [ ] **Step 5: Commit**

```bash
git add keycloak-theme/src/components/InputField.tsx keycloak-theme/src/__tests__/components/InputField.test.tsx
git commit -m "feat(keycloak-theme): add InputField component with password toggle"
```

---

### Task 5: Button components — PrimaryButton and GoogleButton

**Files:**
- Create: `keycloak-theme/src/components/PrimaryButton.tsx`
- Create: `keycloak-theme/src/components/GoogleButton.tsx`

No separate unit test — these are rendered and verified via page tests in Tasks 7–12.

- [ ] **Step 1: Create `keycloak-theme/src/components/PrimaryButton.tsx`**

```tsx
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  type?: "submit" | "button";
  disabled?: boolean;
  onClick?: () => void;
};

const style: React.CSSProperties = {
  width: "100%",
  height: "var(--button-height, 48px)",
  backgroundColor: "var(--color-primary, #007bff)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--button-radius, 5px)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.15s",
};

export default function PrimaryButton({ children, type = "submit", disabled, onClick }: Props) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...style,
        backgroundColor: disabled ? "#6c757d" : "var(--color-primary, #007bff)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-primary-hover, #0069d9)";
      }}
      onMouseLeave={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-primary, #007bff)";
      }}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create `keycloak-theme/src/components/GoogleButton.tsx`**

```tsx
const style: React.CSSProperties = {
  width: "100%",
  height: "var(--button-height, 48px)",
  backgroundColor: "#fff",
  color: "var(--color-text-dark, #0e121b)",
  border: "1px solid var(--color-border, #e1e4ea)",
  borderRadius: "var(--button-radius, 5px)",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  textDecoration: "none",
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function GoogleButton({ href }: { href: string }) {
  return (
    <a href={href} style={style}>
      <GoogleIcon />
    </a>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add keycloak-theme/src/components/PrimaryButton.tsx keycloak-theme/src/components/GoogleButton.tsx
git commit -m "feat(keycloak-theme): add PrimaryButton and GoogleButton components"
```

---

### Task 6: Navigation components — BackButton and Divider

**Files:**
- Create: `keycloak-theme/src/components/BackButton.tsx`
- Create: `keycloak-theme/src/components/Divider.tsx`

- [ ] **Step 1: Create `keycloak-theme/src/components/BackButton.tsx`**

```tsx
const style: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-text-dark, #0e121b)",
  padding: 0,
};

export default function BackButton({ href }: { href: string }) {
  return (
    <a href={href} style={{ ...style, textDecoration: "none" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </a>
  );
}
```

- [ ] **Step 2: Create `keycloak-theme/src/components/Divider.tsx`**

```tsx
const wrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const lineStyle: React.CSSProperties = {
  flex: 1,
  height: "1px",
  backgroundColor: "var(--color-border, #e1e4ea)",
};

const textStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "var(--color-text-light, #929292)",
  whiteSpace: "nowrap",
};

export default function Divider({ text = "or continue with" }: { text?: string }) {
  return (
    <div style={wrapperStyle}>
      <div style={lineStyle} />
      <span style={textStyle}>{text}</span>
      <div style={lineStyle} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add keycloak-theme/src/components/BackButton.tsx keycloak-theme/src/components/Divider.tsx
git commit -m "feat(keycloak-theme): add BackButton and Divider components"
```

---

### Task 7: Login page (Figma 0.1)

**Files:**
- Create: `keycloak-theme/src/pages/Login.tsx`
- Create: `keycloak-theme/src/__tests__/pages/Login.test.tsx`

- [ ] **Step 1: Write the failing test**

`keycloak-theme/src/__tests__/pages/Login.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import Login from "../../pages/Login";

type LoginKcContext = Extract<KcContext, { pageId: "login.ftl" }>;

const mockKcContext: LoginKcContext = {
  pageId: "login.ftl",
  url: { loginAction: "https://auth.example.com/login-action" } as LoginKcContext["url"],
  realm: {
    registrationAllowed: true,
    resetPasswordAllowed: true,
    loginWithEmailAllowed: true,
  } as LoginKcContext["realm"],
  social: {
    displayInfo: true,
    providers: [{ alias: "google", displayName: "Google", loginUrl: "https://auth.example.com/google", providerId: "google" }],
  },
  login: { username: "" } as LoginKcContext["login"],
  auth: {} as LoginKcContext["auth"],
  usernameHidden: false,
  registrationDisabled: false,
  messagesPerField: { existsError: () => false, get: () => "" } as unknown as LoginKcContext["messagesPerField"],
} as unknown as LoginKcContext;

describe("Login page", () => {
  it("renders the Login heading", () => {
    render(<Login kcContext={mockKcContext} />);
    expect(screen.getByRole("heading", { name: /login/i })).toBeInTheDocument();
  });

  it("renders form with correct action", () => {
    render(<Login kcContext={mockKcContext} />);
    const form = screen.getByRole("form");
    expect(form).toHaveAttribute("action", "https://auth.example.com/login-action");
  });

  it("renders email and password inputs", () => {
    render(<Login kcContext={mockKcContext} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders Google button when google provider present", () => {
    render(<Login kcContext={mockKcContext} />);
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
  });

  it("renders Forgot Password link", () => {
    render(<Login kcContext={mockKcContext} />);
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it("renders Create Account link when registration allowed", () => {
    render(<Login kcContext={mockKcContext} />);
    expect(screen.getByText(/create an account/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../../pages/Login'`

- [ ] **Step 3: Create `keycloak-theme/src/pages/Login.tsx`**

```tsx
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

  const googleProvider = social.providers?.find((p) => p.alias === "google");

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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: PASS — all 6 Login tests green.

- [ ] **Step 5: Commit**

```bash
git add keycloak-theme/src/pages/Login.tsx keycloak-theme/src/__tests__/pages/Login.test.tsx
git commit -m "feat(keycloak-theme): implement Login page matching Figma 0.1"
```

---

### Task 8: Register page (Figma 0.2)

**Files:**
- Create: `keycloak-theme/src/pages/Register.tsx`
- Create: `keycloak-theme/src/__tests__/pages/Register.test.tsx`

- [ ] **Step 1: Write the failing test**

`keycloak-theme/src/__tests__/pages/Register.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import Register from "../../pages/Register";

type RegisterKcContext = Extract<KcContext, { pageId: "register.ftl" }>;

const mockKcContext: RegisterKcContext = {
  pageId: "register.ftl",
  url: {
    registrationAction: "https://auth.example.com/register-action",
    loginUrl: "https://auth.example.com/login",
  } as RegisterKcContext["url"],
  realm: { registrationEmailAsUsername: false } as RegisterKcContext["realm"],
  social: {
    displayInfo: true,
    providers: [{ alias: "google", displayName: "Google", loginUrl: "https://auth.example.com/google", providerId: "google" }],
  },
  passwordRequired: true,
  recaptchaRequired: false,
  profile: { attributesByName: {} } as RegisterKcContext["profile"],
  messagesPerField: { existsError: () => false, get: () => "" } as unknown as RegisterKcContext["messagesPerField"],
} as unknown as RegisterKcContext;

describe("Register page", () => {
  it("renders the Create Account heading", () => {
    render(<Register kcContext={mockKcContext} />);
    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
  });

  it("renders form with correct action", () => {
    render(<Register kcContext={mockKcContext} />);
    expect(screen.getByRole("form")).toHaveAttribute("action", "https://auth.example.com/register-action");
  });

  it("renders first name, last name, email and password fields", () => {
    render(<Register kcContext={mockKcContext} />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("renders business name field", () => {
    render(<Register kcContext={mockKcContext} />);
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
  });

  it("renders terms & conditions checkbox", () => {
    render(<Register kcContext={mockKcContext} />);
    expect(screen.getByRole("checkbox", { name: /terms/i })).toBeInTheDocument();
  });

  it("renders Google button when google provider present", () => {
    render(<Register kcContext={mockKcContext} />);
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../../pages/Register'`

- [ ] **Step 3: Create `keycloak-theme/src/pages/Register.tsx`**

```tsx
import type { KcContext } from "keycloakify/login/KcContext";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";
import BackButton from "../components/BackButton";
import Divider from "../components/Divider";

type RegisterKcContext = Extract<KcContext, { pageId: "register.ftl" }>;

export default function Register({ kcContext }: { kcContext: RegisterKcContext }) {
  const { url, social } = kcContext;
  const googleProvider = social.providers?.find((p) => p.alias === "google");

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

            <div>
              <InputField
                id="businessName"
                label="Business Name (optional)"
                type="text"
                name="user.attributes.businessName"
                placeholder="Your business name"
              />
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
              <input type="checkbox" name="termsAccepted" required aria-label="I agree to the Terms & Conditions" style={{ marginTop: "2px", flexShrink: 0 }} />
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: PASS — all 6 Register tests green.

- [ ] **Step 5: Commit**

```bash
git add keycloak-theme/src/pages/Register.tsx keycloak-theme/src/__tests__/pages/Register.test.tsx
git commit -m "feat(keycloak-theme): implement Register page matching Figma 0.2"
```

---

### Task 9: ResetPassword page (Figma 0.3)

**Files:**
- Create: `keycloak-theme/src/pages/ResetPassword.tsx`
- Create: `keycloak-theme/src/__tests__/pages/ResetPassword.test.tsx`

- [ ] **Step 1: Write the failing test**

`keycloak-theme/src/__tests__/pages/ResetPassword.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import ResetPassword from "../../pages/ResetPassword";

type ResetPasswordKcContext = Extract<KcContext, { pageId: "login-reset-password.ftl" }>;

const mockKcContext: ResetPasswordKcContext = {
  pageId: "login-reset-password.ftl",
  url: {
    loginAction: "https://auth.example.com/reset-action",
    loginUrl: "https://auth.example.com/login",
  } as ResetPasswordKcContext["url"],
  realm: { loginWithEmailAllowed: true, duplicationEmailsAllowed: false } as ResetPasswordKcContext["realm"],
  auth: {} as ResetPasswordKcContext["auth"],
} as unknown as ResetPasswordKcContext;

describe("ResetPassword page", () => {
  it("renders the Reset Password heading", () => {
    render(<ResetPassword kcContext={mockKcContext} />);
    expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
  });

  it("renders form with correct action", () => {
    render(<ResetPassword kcContext={mockKcContext} />);
    expect(screen.getByRole("form")).toHaveAttribute("action", "https://auth.example.com/reset-action");
  });

  it("renders email input", () => {
    render(<ResetPassword kcContext={mockKcContext} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("renders Send Reset Link button", () => {
    render(<ResetPassword kcContext={mockKcContext} />);
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../../pages/ResetPassword'`

- [ ] **Step 3: Create `keycloak-theme/src/pages/ResetPassword.tsx`**

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: PASS — all 4 ResetPassword tests green.

- [ ] **Step 5: Commit**

```bash
git add keycloak-theme/src/pages/ResetPassword.tsx keycloak-theme/src/__tests__/pages/ResetPassword.test.tsx
git commit -m "feat(keycloak-theme): implement ResetPassword page matching Figma 0.3"
```

---

### Task 10: UpdatePassword page (Figma 0.5)

**Files:**
- Create: `keycloak-theme/src/pages/UpdatePassword.tsx`
- Create: `keycloak-theme/src/__tests__/pages/UpdatePassword.test.tsx`

- [ ] **Step 1: Write the failing test**

`keycloak-theme/src/__tests__/pages/UpdatePassword.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import UpdatePassword from "../../pages/UpdatePassword";

type UpdatePasswordKcContext = Extract<KcContext, { pageId: "login-update-password.ftl" }>;

const mockKcContext: UpdatePasswordKcContext = {
  pageId: "login-update-password.ftl",
  url: {
    loginAction: "https://auth.example.com/update-password-action",
    loginUrl: "https://auth.example.com/login",
  } as UpdatePasswordKcContext["url"],
  isAppInitiatedAction: false,
  messagesPerField: { existsError: () => false, get: () => "" } as unknown as UpdatePasswordKcContext["messagesPerField"],
} as unknown as UpdatePasswordKcContext;

describe("UpdatePassword page", () => {
  it("renders the Create New Password heading", () => {
    render(<UpdatePassword kcContext={mockKcContext} />);
    expect(screen.getByRole("heading", { name: /create new password/i })).toBeInTheDocument();
  });

  it("renders form with correct action", () => {
    render(<UpdatePassword kcContext={mockKcContext} />);
    expect(screen.getByRole("form")).toHaveAttribute("action", "https://auth.example.com/update-password-action");
  });

  it("renders new and confirm password inputs", () => {
    render(<UpdatePassword kcContext={mockKcContext} />);
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("renders Update Password button", () => {
    render(<UpdatePassword kcContext={mockKcContext} />);
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../../pages/UpdatePassword'`

- [ ] **Step 3: Create `keycloak-theme/src/pages/UpdatePassword.tsx`**

```tsx
import type { KcContext } from "keycloakify/login/KcContext";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import BackButton from "../components/BackButton";

type UpdatePasswordKcContext = Extract<KcContext, { pageId: "login-update-password.ftl" }>;

export default function UpdatePassword({ kcContext }: { kcContext: UpdatePasswordKcContext }) {
  const { url } = kcContext;

  return (
    <AuthBackground>
      <AuthCard>
        <BackButton href={url.loginUrl} />

        <div>
          <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", marginBottom: "4px" }}>
            Create New Password
          </h1>
          <p style={{ color: "var(--color-text-mid)" }}>Enter your new password to complete the reset</p>
        </div>

        <form aria-label="update-password" method="POST" action={url.loginAction}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <InputField
              id="password-new"
              label="New Password"
              type="password"
              name="password-new"
              placeholder="Type new password"
              autoComplete="new-password"
              required
            />
            <InputField
              id="password-confirm"
              label="Confirm Password"
              type="password"
              name="password-confirm"
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
            />
          </div>

          <div style={{ marginTop: "24px" }}>
            <PrimaryButton type="submit">Update Password</PrimaryButton>
          </div>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: PASS — all 4 UpdatePassword tests green.

- [ ] **Step 5: Commit**

```bash
git add keycloak-theme/src/pages/UpdatePassword.tsx keycloak-theme/src/__tests__/pages/UpdatePassword.test.tsx
git commit -m "feat(keycloak-theme): implement UpdatePassword page matching Figma 0.5"
```

---

### Task 11: Info page — email sent (0.4) and success (0.6)

**Files:**
- Create: `keycloak-theme/src/pages/Info.tsx`
- Create: `keycloak-theme/src/__tests__/pages/Info.test.tsx`

The `info.ftl` page handles multiple states. When KC sends the "email sent" confirmation, `kcContext.messageHeader` is `"emailSent"` (or similar). The success state uses a different `messageHeader`. The component branches on this.

- [ ] **Step 1: Write the failing test**

`keycloak-theme/src/__tests__/pages/Info.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import Info from "../../pages/Info";

type InfoKcContext = Extract<KcContext, { pageId: "info.ftl" }>;

function makeContext(overrides: Partial<InfoKcContext>): InfoKcContext {
  return {
    pageId: "info.ftl",
    url: { loginUrl: "https://auth.example.com/login" } as InfoKcContext["url"],
    messageHeader: undefined,
    message: { summary: "Default message" } as InfoKcContext["message"],
    requiredActions: undefined,
    actionUri: undefined,
    ...overrides,
  } as unknown as InfoKcContext;
}

describe("Info page", () => {
  it("renders success state with Great heading and checkmark", () => {
    render(<Info kcContext={makeContext({ messageHeader: "passwordUpdated" })} />);
    expect(screen.getByRole("heading", { name: /great/i })).toBeInTheDocument();
    expect(screen.getByTestId("success-icon")).toBeInTheDocument();
  });

  it("renders email sent state with check your email heading", () => {
    render(<Info kcContext={makeContext({ messageHeader: "emailSent" })} />);
    expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
  });

  it("renders Done button linking back to login", () => {
    render(<Info kcContext={makeContext({ messageHeader: "passwordUpdated" })} />);
    expect(screen.getByRole("link", { name: /done/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../../pages/Info'`

- [ ] **Step 3: Create `keycloak-theme/src/pages/Info.tsx`**

```tsx
import type { KcContext } from "keycloakify/login/KcContext";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import BackButton from "../components/BackButton";

type InfoKcContext = Extract<KcContext, { pageId: "info.ftl" }>;

const CheckIcon = () => (
  <div
    data-testid="success-icon"
    style={{
      width: "63px",
      height: "60px",
      borderRadius: "50%",
      backgroundColor: "#e8f5e9",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto",
    }}
  >
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2.5" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </div>
);

const EnvelopeIcon = () => (
  <div
    style={{
      width: "63px",
      height: "60px",
      borderRadius: "50%",
      backgroundColor: "#e3f0ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto",
    }}
  >
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22 4 12 13 2 4" />
    </svg>
  </div>
);

export default function Info({ kcContext }: { kcContext: InfoKcContext }) {
  const { url, messageHeader, message } = kcContext;

  const isSuccess = messageHeader === "passwordUpdated" || messageHeader === "successHeader";
  const isEmailSent = messageHeader === "emailSent" || messageHeader === "emailSentHeader";

  return (
    <AuthBackground>
      <AuthCard>
        <BackButton href={url.loginUrl} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
          {isSuccess && <CheckIcon />}
          {isEmailSent && <EnvelopeIcon />}

          <div>
            <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", marginBottom: "8px" }}>
              {isSuccess ? "Great" : isEmailSent ? "Check your email" : messageHeader ?? "Information"}
            </h1>
            <p style={{ color: "var(--color-text-mid)" }}>
              {isSuccess
                ? "Your password has been reset successfully!"
                : message?.summary ?? ""}
            </p>
          </div>
        </div>

        <a
          href={url.loginUrl}
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
          Done
        </a>
      </AuthCard>
    </AuthBackground>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: PASS — all 3 Info tests green.

- [ ] **Step 5: Commit**

```bash
git add keycloak-theme/src/pages/Info.tsx keycloak-theme/src/__tests__/pages/Info.test.tsx
git commit -m "feat(keycloak-theme): implement Info page (email sent + success states, Figma 0.4 + 0.6)"
```

---

### Task 12: LoginOtp page (MFA)

**Files:**
- Create: `keycloak-theme/src/pages/LoginOtp.tsx`
- Create: `keycloak-theme/src/__tests__/pages/LoginOtp.test.tsx`

- [ ] **Step 1: Write the failing test**

`keycloak-theme/src/__tests__/pages/LoginOtp.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import LoginOtp from "../../pages/LoginOtp";

type OtpKcContext = Extract<KcContext, { pageId: "login-otp.ftl" }>;

const mockKcContext: OtpKcContext = {
  pageId: "login-otp.ftl",
  url: {
    loginAction: "https://auth.example.com/otp-action",
    loginUrl: "https://auth.example.com/login",
  } as OtpKcContext["url"],
  otpLogin: {
    userOtpCredentials: [],
    selectedCredentialId: "",
  } as OtpKcContext["otpLogin"],
} as unknown as OtpKcContext;

describe("LoginOtp page", () => {
  it("renders the Verify Your Identity heading", () => {
    render(<LoginOtp kcContext={mockKcContext} />);
    expect(screen.getByRole("heading", { name: /verify your identity/i })).toBeInTheDocument();
  });

  it("renders form with correct action", () => {
    render(<LoginOtp kcContext={mockKcContext} />);
    expect(screen.getByRole("form")).toHaveAttribute("action", "https://auth.example.com/otp-action");
  });

  it("renders OTP input field", () => {
    render(<LoginOtp kcContext={mockKcContext} />);
    expect(screen.getByLabelText(/one-time code/i)).toBeInTheDocument();
  });

  it("renders Verify button", () => {
    render(<LoginOtp kcContext={mockKcContext} />);
    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../../pages/LoginOtp'`

- [ ] **Step 3: Create `keycloak-theme/src/pages/LoginOtp.tsx`**

```tsx
import type { KcContext } from "keycloakify/login/KcContext";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import PrimaryButton from "../components/PrimaryButton";

type OtpKcContext = Extract<KcContext, { pageId: "login-otp.ftl" }>;

export default function LoginOtp({ kcContext }: { kcContext: OtpKcContext }) {
  const { url } = kcContext;

  return (
    <AuthBackground>
      <AuthCard>
        <div>
          <h1 style={{ fontSize: "30px", fontWeight: 700, color: "var(--color-text-dark)", marginBottom: "4px" }}>
            Verify your identity
          </h1>
          <p style={{ color: "var(--color-text-mid)" }}>Enter the code from your authenticator app</p>
        </div>

        <form aria-label="otp" method="POST" action={url.loginAction}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <label
              htmlFor="otp"
              style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-dark)" }}
            >
              One-time code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              style={{
                width: "100%",
                height: "var(--input-height, 48px)",
                border: "1px solid var(--color-border, #e1e4ea)",
                borderRadius: "var(--input-radius, 5px)",
                padding: "8px 16px",
                fontSize: "24px",
                textAlign: "center",
                letterSpacing: "0.5em",
                fontFamily: "var(--font-family)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginTop: "24px" }}>
            <PrimaryButton type="submit">Verify</PrimaryButton>
          </div>
        </form>

        <p style={{ textAlign: "center", fontSize: "14px" }}>
          <a href={url.loginUrl} style={{ color: "var(--color-primary)" }}>
            Use a different method
          </a>
        </p>
      </AuthCard>
    </AuthBackground>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: PASS — all 4 LoginOtp tests green.

- [ ] **Step 5: Commit**

```bash
git add keycloak-theme/src/pages/LoginOtp.tsx keycloak-theme/src/__tests__/pages/LoginOtp.test.tsx
git commit -m "feat(keycloak-theme): implement LoginOtp MFA page"
```

---

### Task 13: Wire KcPage router and main entrypoint

**Files:**
- Create: `keycloak-theme/src/KcPage.tsx`
- Create: `keycloak-theme/src/main.tsx`

- [ ] **Step 1: Create `keycloak-theme/src/KcPage.tsx`**

```tsx
import { lazy, Suspense } from "react";
import type { KcContext } from "keycloakify/login/KcContext";
import DefaultPage from "keycloakify/login/DefaultPage";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Info = lazy(() => import("./pages/Info"));
const LoginOtp = lazy(() => import("./pages/LoginOtp"));

export default function KcPage({ kcContext }: { kcContext: KcContext }) {
  return (
    <Suspense>
      {(() => {
        switch (kcContext.pageId) {
          case "login.ftl":
            return <Login kcContext={kcContext} />;
          case "register.ftl":
            return <Register kcContext={kcContext} />;
          case "login-reset-password.ftl":
            return <ResetPassword kcContext={kcContext} />;
          case "login-update-password.ftl":
            return <UpdatePassword kcContext={kcContext} />;
          case "info.ftl":
            return <Info kcContext={kcContext} />;
          case "login-otp.ftl":
            return <LoginOtp kcContext={kcContext} />;
          default:
            return (
              <DefaultPage
                kcContext={kcContext}
                doUseDefaultCss={true}
                classes={{}}
                Template={({ children }) => <>{children}</>}
              />
            );
        }
      })()}
    </Suspense>
  );
}
```

- [ ] **Step 2: Create `keycloak-theme/src/main.tsx`**

```tsx
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { getKcContextMock } from "keycloakify/login/KcContext";

const KcPage = lazy(() => import("./KcPage"));

const kcContext =
  (window as { kcContext?: import("keycloakify/login/KcContext").KcContext }).kcContext ??
  getKcContextMock({
    pageId: "login.ftl",
    overrides: {
      realm: {
        registrationAllowed: true,
        resetPasswordAllowed: true,
        loginWithEmailAllowed: true,
      },
      social: {
        displayInfo: true,
        providers: [
          {
            alias: "google",
            displayName: "Google",
            loginUrl: "#",
            providerId: "google",
          },
        ],
      },
    },
  });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense>
      <KcPage kcContext={kcContext} />
    </Suspense>
  </StrictMode>
);
```

- [ ] **Step 3: Verify dev server starts and renders Login page**

```bash
cd keycloak-theme
npm run dev
```

Expected: Vite starts (usually at http://localhost:5173), browser shows the Login page with correct styling — blue button, Inter font, white card on gradient background.

Check each page by editing the `pageId` in `main.tsx` `getKcContextMock` call:
- `"register.ftl"` → Create Account page
- `"login-reset-password.ftl"` → Reset Password page
- `"login-update-password.ftl"` → Create New Password page
- `"info.ftl"` → Success page (set `overrides: { messageHeader: "passwordUpdated" }`)
- `"login-otp.ftl"` → MFA page

Restore to `"login.ftl"` after verification.

- [ ] **Step 4: Run full test suite**

```bash
cd keycloak-theme
npm test -- --reporter=verbose
```

Expected: ALL tests pass — no failures.

- [ ] **Step 5: Commit**

```bash
git add keycloak-theme/src/KcPage.tsx keycloak-theme/src/main.tsx
git commit -m "feat(keycloak-theme): wire KcPage router and dev entrypoint"
```

---

### Task 14: Build JAR and deploy to Docker

- [ ] **Step 1: Build the JAR**

```bash
cd keycloak-theme
npm run build
```

Expected output:
```
✓ built in Xs
keycloakify: Generating JAR...
keycloakify: JAR saved to dist_keycloak/starky-theme-X.X.X.jar
```

The JAR file will be at `keycloak-theme/dist_keycloak/starky-theme-*.jar`.

- [ ] **Step 2: Add `dist_keycloak/` to .gitignore**

Add this line to the root `.gitignore` (or create `keycloak-theme/.gitignore`):
```
dist_keycloak/
dist/
node_modules/
```

- [ ] **Step 3: Copy JAR to the Docker container**

Run from the project root on the **server** (`root@auth`):

```bash
# From the machine where the JAR was built — copy to server first, then:
docker cp keycloak-theme/dist_keycloak/starky-theme-*.jar keycloak-server:/opt/keycloak/providers/
```

If building on a different machine, scp the JAR to the server first:
```bash
scp keycloak-theme/dist_keycloak/starky-theme-*.jar root@auth.allspicetech.com.au:/tmp/
# Then on server:
docker cp /tmp/starky-theme-*.jar keycloak-server:/opt/keycloak/providers/
```

- [ ] **Step 4: Restart Keycloak to load the new provider**

```bash
docker restart keycloak-server
```

Wait ~20 seconds for Keycloak to fully start.

- [ ] **Step 5: Verify the theme is registered**

```bash
docker exec keycloak-server ls /opt/keycloak/providers/
```

Expected: `starky-theme-*.jar` appears in the list.

- [ ] **Step 6: Activate the theme in Keycloak Admin**

1. Log in to `https://auth.allspicetech.com.au` as admin
2. Select realm `starky-dev` (top-left dropdown)
3. Go to **Realm Settings** → **Themes** tab
4. Set **Login theme** to `starky`
5. Click **Save**

- [ ] **Step 7: Verify in browser**

Navigate to `http://localhost:3000` (Starky frontend). Click Login — you should be redirected to the Keycloak hosted login page now showing the Starky theme (white card, Inter font, blue button, gradient background).

- [ ] **Step 8: Commit**

```bash
git add keycloak-theme/.gitignore
git commit -m "chore(keycloak-theme): add gitignore for build artifacts"
```

---

### Task 15: Configure businessName custom attribute in Keycloak

This is a Keycloak Admin configuration step — no code changes. Required for the Register page to accept and store the business name field.

- [ ] **Step 1: Enable User Profile in Keycloak Admin**

1. Log in to Keycloak Admin at `https://auth.allspicetech.com.au`
2. Select realm `starky-dev`
3. Go to **Realm Settings** → **General** tab
4. Ensure **User profile enabled** is set to `ON`
5. Click **Save**

- [ ] **Step 2: Add businessName attribute**

1. Go to **Realm Settings** → **User profile** tab
2. Click **Add attribute**
3. Fill in:
   - **Name:** `businessName`
   - **Display name:** `Business Name`
   - **Required field:** `No` (it's optional)
   - **Multivalued:** `No`
4. Under **Permissions**: set Read by `user` and `admin`, Write by `user` and `admin`
5. Click **Save**

- [ ] **Step 3: Verify the field is accepted**

Register a new test account via `http://localhost:3000` and fill in the Business Name field. After registration, check the user in Keycloak Admin (Users → find user → Attributes tab) — `businessName` should appear with the entered value.

---

## Verification Checklist

After all tasks complete, walk through each flow end-to-end:

- [ ] Login with email/password → redirects back to Starky app on success
- [ ] Login with Google → OAuth flow completes → redirects to Starky app
- [ ] Forgot Password → enter email → "check your email" confirmation screen → receive email → click link → Create New Password page → success screen
- [ ] Register new account → all fields submit → user created in KC
- [ ] Login with MFA-enabled account → OTP screen appears → code accepted
- [ ] Visual check: card is 482px wide, Inter font loads, buttons are #007BFF, no default KC styles visible
- [ ] Mobile check: resize to 375px — card scales to full width with padding
