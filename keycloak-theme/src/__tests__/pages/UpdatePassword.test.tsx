import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import UpdatePassword from "../../pages/UpdatePassword";

type UpdatePasswordKcContext = Extract<KcContext, { pageId: "login-update-password.ftl" }>;

const mockKcContext = {
  pageId: "login-update-password.ftl" as const,
  url: {
    loginAction: "https://auth.example.com/update-password-action",
    loginUrl: "https://auth.example.com/login",
  },
  isAppInitiatedAction: false,
  messagesPerField: { existsError: () => false, get: () => "" },
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
    expect(screen.getByLabelText(/new password/i, { selector: "input" })).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i, { selector: "input" })).toBeInTheDocument();
  });

  it("renders Update Password button", () => {
    render(<UpdatePassword kcContext={mockKcContext} />);
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });
});
