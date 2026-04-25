import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import Info from "../../pages/Info";

type InfoKcContext = Extract<KcContext, { pageId: "info.ftl" }>;

function makeContext(overrides: Partial<Record<string, unknown>>): InfoKcContext {
  return {
    pageId: "info.ftl" as const,
    url: { loginUrl: "https://auth.example.com/login" },
    messageHeader: undefined,
    message: { summary: "Default message" },
    requiredActions: undefined,
    actionUri: undefined,
    ...overrides,
  } as unknown as InfoKcContext;
}

describe("Info page", () => {
  it("renders success state with Great heading and checkmark when message.type is success", () => {
    render(<Info kcContext={makeContext({ message: { type: "success", summary: "Password updated" } })} />);
    expect(screen.getByRole("heading", { name: /great/i })).toBeInTheDocument();
    expect(screen.getByTestId("success-icon")).toBeInTheDocument();
  });

  it("renders email sent state when summary mentions email", () => {
    render(<Info kcContext={makeContext({ message: { type: "info", summary: "You should receive an email shortly." } })} />);
    expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
  });

  it("renders Back to Login button on success state", () => {
    render(<Info kcContext={makeContext({ message: { type: "success", summary: "Done" } })} />);
    expect(screen.getByRole("link", { name: /back to login/i })).toBeInTheDocument();
  });

  it("renders Done button on non-success state", () => {
    render(<Info kcContext={makeContext({ message: { type: "info", summary: "Check your inbox." } })} />);
    expect(screen.getByRole("link", { name: /done/i })).toBeInTheDocument();
  });
});
