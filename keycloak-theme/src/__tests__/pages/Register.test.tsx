import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import Register from "../../pages/Register";

type RegisterKcContext = Extract<KcContext, { pageId: "register.ftl" }>;

const mockKcContext = {
  pageId: "register.ftl" as const,
  url: {
    registrationAction: "https://auth.example.com/register-action",
    loginUrl: "https://auth.example.com/login",
  },
  realm: { registrationEmailAsUsername: false },
  social: {
    displayInfo: true,
    providers: [
      { alias: "google", displayName: "Google", loginUrl: "https://auth.example.com/google", providerId: "google" },
    ],
  },
  passwordRequired: true,
  recaptchaRequired: false,
  profile: { attributesByName: {} },
  messagesPerField: { existsError: () => false, get: () => "" },
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
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i, { selector: "input" })).toBeInTheDocument();
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
