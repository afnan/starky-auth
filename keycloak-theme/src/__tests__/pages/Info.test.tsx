import { render, screen } from "@testing-library/react";
import type { KcContext } from "keycloakify/login/KcContext";
import Info from "../../pages/Info";

type InfoKcContext = Extract<KcContext, { pageId: "info.ftl" }>;

function makeContext(overrides: Partial<Record<string, unknown>>): InfoKcContext {
  return {
    pageId: "info.ftl" as const,
    url: {
      loginUrl: "https://auth.example.com/login",
      loginRestartFlowUrl: "https://auth.example.com/restart",
    },
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

  it("renders Confirm Email page when summary mentions email", () => {
    render(<Info kcContext={makeContext({ message: { type: "info", summary: "You should receive an email shortly." } })} />);
    expect(screen.getByRole("heading", { name: /confirm email/i })).toBeInTheDocument();
    expect(screen.getByText(/password reset link has been sent/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /didn.+t receive the link\? send again/i })).toBeInTheDocument();
  });

  it("renders single Done button on success state pointing to loginUrl", () => {
    render(
      <Info
        kcContext={makeContext({
          message: { type: "success", summary: "Done" },
          actionUri: "https://auth.example.com/should-be-ignored",
        })}
      />,
    );
    const done = screen.getByRole("link", { name: /^done$/i });
    expect(done).toBeInTheDocument();
    // Per spec, Done returns to Login (0.1) — actionUri must NOT be used here.
    expect(done).toHaveAttribute("href", "https://auth.example.com/login");
    // No Back link on the success screen — Done is the single CTA.
    expect(screen.queryByRole("link", { name: /^back$/i })).not.toBeInTheDocument();
  });

  it("renders Done button on non-success state", () => {
    render(<Info kcContext={makeContext({ message: { type: "info", summary: "Check your inbox." } })} />);
    expect(screen.getByRole("link", { name: /done/i })).toBeInTheDocument();
  });
});
