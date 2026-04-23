import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import ResetPassword from "../../pages/ResetPassword";

type ResetPasswordKcContext = Extract<KcContext, { pageId: "login-reset-password.ftl" }>;

const mockKcContext = {
  pageId: "login-reset-password.ftl" as const,
  url: {
    loginAction: "https://auth.example.com/reset-action",
    loginUrl: "https://auth.example.com/login",
  },
  realm: { loginWithEmailAllowed: true, duplicationEmailsAllowed: false },
  auth: {},
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
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it("renders Send Reset Link button", () => {
    render(<ResetPassword kcContext={mockKcContext} />);
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });
});
