// Single source of truth for client-side password rules across the theme.
// Server-side rules in Keycloak's password policy must stay in sync —
// update both when changing.

export type PasswordRule = {
  id: string;
  /** Short label used in the info popover ("At least 8 characters"). */
  text: string;
  /** Inline error sentence when this rule fails ("Minimum 8 characters required"). */
  errorMessage: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    text: "At least 8 characters",
    errorMessage: "Minimum 8 characters required",
    test: (p) => p.length >= 8,
  },
  {
    id: "digit",
    text: "Contains a digit",
    errorMessage: "Minimum 1 digit required",
    test: (p) => /\d/.test(p),
  },
  {
    id: "uppercase",
    text: "Contains an uppercase letter",
    errorMessage: "At least 1 uppercase letter required",
    test: (p) => /[A-Z]/.test(p),
  },
];

export type EvaluatedRule = { id: string; text: string; pass: boolean };

export function evaluatePassword(password: string): EvaluatedRule[] {
  return PASSWORD_RULES.map(({ id, text, test }) => ({ id, text, pass: test(password) }));
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every(({ test }) => test(password));
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

/**
 * Returns the error message for the first failing rule (in PASSWORD_RULES order),
 * or undefined when the password satisfies every rule.
 *
 * Rules are checked sequentially so the user sees one corrective hint at a time
 * — e.g. "Minimum 8 characters required" first, then "Minimum 1 digit required"
 * once length is satisfied, and so on.
 */
export function getFirstPasswordError(password: string): string | undefined {
  return PASSWORD_RULES.find(({ test }) => !test(password))?.errorMessage;
}
