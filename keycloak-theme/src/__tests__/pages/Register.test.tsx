import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("blocks submission and shows per-field errors when fields are empty", () => {
    render(<Register kcContext={mockKcContext} />);
    const form = screen.getByRole("form") as HTMLFormElement;

    // fireEvent.submit returns false when the handler called preventDefault.
    const propagated = fireEvent.submit(form);

    expect(propagated).toBe(false);
    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/minimum 8 characters required/i)).toBeInTheDocument();
    expect(screen.getByText(/must accept the terms/i)).toBeInTheDocument();
  });

  it("blocks submission when the password fails a non-length rule", async () => {
    const user = userEvent.setup();
    render(<Register kcContext={mockKcContext} />);

    await user.type(screen.getByLabelText(/first name/i), "Ada");
    await user.type(screen.getByLabelText(/last name/i), "Lovelace");
    await user.type(screen.getByLabelText(/email address/i), "ada@example.com");
    // 8 chars (length OK) but no uppercase + no digit + no special.
    await user.type(screen.getByLabelText(/^password$/i, { selector: "input" }), "abcdefgh");
    await user.click(screen.getByRole("checkbox", { name: /terms/i }));

    const propagated = fireEvent.submit(screen.getByRole("form") as HTMLFormElement);
    expect(propagated).toBe(false);
    expect(screen.getByText(/uppercase, lowercase and a number/i)).toBeInTheDocument();
  });

  it("blocks submission when the password equals the email (notIdentity rule)", async () => {
    const user = userEvent.setup();
    render(<Register kcContext={mockKcContext} />);

    await user.type(screen.getByLabelText(/first name/i), "Ada");
    await user.type(screen.getByLabelText(/last name/i), "Lovelace");
    // Identity that already satisfies length+mixed+special so notIdentity is the
    // only failing rule when password === email.
    await user.type(screen.getByLabelText(/email address/i), "Ada1@example.com");
    await user.type(screen.getByLabelText(/^password$/i, { selector: "input" }), "Ada1@example.com");
    await user.click(screen.getByRole("checkbox", { name: /terms/i }));

    const propagated = fireEvent.submit(screen.getByRole("form") as HTMLFormElement);
    expect(propagated).toBe(false);
    expect(screen.getByText(/same as your email or username/i)).toBeInTheDocument();
  });

  it("blocks submission when email format is invalid", async () => {
    const user = userEvent.setup();
    render(<Register kcContext={mockKcContext} />);

    await user.type(screen.getByLabelText(/first name/i), "Ada");
    await user.type(screen.getByLabelText(/last name/i), "Lovelace");
    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.type(screen.getByLabelText(/^password$/i, { selector: "input" }), "Abcdefg1!");
    await user.click(screen.getByRole("checkbox", { name: /terms/i }));

    const form = screen.getByRole("form") as HTMLFormElement;
    const propagated = fireEvent.submit(form);

    expect(propagated).toBe(false);
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it("allows submission when all client-side validations pass", async () => {
    const user = userEvent.setup();
    render(<Register kcContext={mockKcContext} />);

    await user.type(screen.getByLabelText(/first name/i), "Ada");
    await user.type(screen.getByLabelText(/last name/i), "Lovelace");
    await user.type(screen.getByLabelText(/email address/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^password$/i, { selector: "input" }), "Abcdefg1!");
    await user.click(screen.getByRole("checkbox", { name: /terms/i }));

    const form = screen.getByRole("form") as HTMLFormElement;
    // Swallow the native form submission so jsdom doesn't log a navigation
    // warning; this listener runs at the form (capture: false → bubble) AFTER
    // React's bubble handler at the root container, so it doesn't affect the
    // assertion about whether the component called preventDefault.
    form.addEventListener("submit", (e) => e.preventDefault());
    fireEvent.submit(form);

    expect(screen.queryByText(/first name is required/i)).toBeNull();
    expect(screen.queryByText(/last name is required/i)).toBeNull();
    expect(screen.queryByText(/email is required/i)).toBeNull();
    expect(screen.queryByText(/enter a valid email address/i)).toBeNull();
    expect(screen.queryByText(/minimum 8 characters required/i)).toBeNull();
    expect(screen.queryByText(/must accept the terms/i)).toBeNull();
  });
});
