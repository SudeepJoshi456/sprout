import { z } from "zod";
import { clientIp, createSession, hashPassword, sessionCookie, underLimit } from "@/lib/server/auth";
import { ApiError, assertSameOrigin, clientState, errorResponse, parseBody } from "@/lib/server/http";
import { createAccount } from "@/lib/server/users";
import { passwordProblem } from "@/lib/password";

const schema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().superRefine((p, ctx) => {
    const problem = passwordProblem(p);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  }),
  acceptedTerms: z.literal(true, { message: "Please confirm you're 18 or older and agree to the Terms and Privacy Policy." }),
});

/** POST /api/auth/signup: creates an account and signs it in. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!(await underLimit(`signup:${clientIp(req)}`, 10, 3600))) {
      throw new ApiError(429, "rate_limited", "Too many sign-ups from this network. Please wait an hour and try again.");
    }
    const { email, password } = await parseBody(req, schema);
    const record = await createAccount(email, await hashPassword(password));
    if (!record) throw new ApiError(409, "email_taken", "There's already an account with this email. Log in instead.");
    const token = await createSession(record.id);
    const res = Response.json({ state: await clientState(record) });
    res.headers.append("set-cookie", sessionCookie(token));
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
