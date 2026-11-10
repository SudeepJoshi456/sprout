/** Password rules shared by the sign-up form and the server. */
export const PASSWORD_MIN = 10;

export function passwordProblem(p: string): string | null {
  if (p.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (p.length > 200) return "That password is too long.";
  if (!/[A-Za-z]/.test(p) || !/[^A-Za-z]/.test(p)) return "Mix letters with at least one number or symbol.";
  return null;
}
