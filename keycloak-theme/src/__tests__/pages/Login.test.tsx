import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import Login from "../../pages/Login";

type LoginKcContext = Extract<KcContext, { pageId: "login.ftl" }>;

const mockKcContext = {
  pageId: "login.ftl" as const,
  url: {
    loginAction: "https://auth.example.com/login-action",
    loginUrl: "https://auth.example.com/login",
    loginResetCredentialsUrl: "https://auth.example.com/reset",
    registrationUrl: "https://auth.example.com/register",
  },
  realm: {
    registrationAllowed: true,
    resetPasswordAllowed: true,
    loginWithEmailAllowed: true,
  },
  social: {
    displayInfo: true,
    providers: [
      { alias: "google", displayName: "Google", loginUrl: "https://auth.example.com/google", providerId: "google" },
    ],
  },
  login: { username: "" },
  auth: {},
  usernameHidden: false,
  registrationDisabled: false,
  messagesPerField: { existsError: () => false, get: () => "" },
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
    expect(screen.getByLabelText(/email address/i, { selector: "input" })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i, { selector: "input" })).toBeInTheDocument();
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

  it("renders ConfirmEmail when Keycloak redirects back to login.ftl with the email-sent info message", () => {
    const postResetContext = {
      ...mockKcContext,
      message: {
        type: "info",
        summary: "You should receive an email shortly with further instructions.",
      },
    } as unknown as LoginKcContext;
    render(<Login kcContext={postResetContext} />);
    expect(screen.getByRole("heading", { name: /confirm email/i })).toBeInTheDocument();
    expect(screen.getByText(/password reset link has been sent/i)).toBeInTheDocument();
    // The standard login form must not render in this state.
    expect(screen.queryByRole("heading", { name: /^login$/i })).not.toBeInTheDocument();
  });

  it("does not render ConfirmEmail for unrelated info messages (e.g. logout success)", () => {
    const logoutContext = {
      ...mockKcContext,
      message: { type: "success", summary: "You have been logged out." },
    } as unknown as LoginKcContext;
    render(<Login kcContext={logoutContext} />);
    expect(screen.getByRole("heading", { name: /^login$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /confirm email/i })).not.toBeInTheDocument();
  });
});
