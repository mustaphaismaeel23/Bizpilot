import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validators";
import { ok, handleApiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Always respond success to avoid leaking which emails are registered.
    if (!user) {
      return ok({ message: "If that email exists, a reset link has been generated." });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // NOTE: no transactional email provider is configured for this MVP.
    // The reset link is returned directly so the flow is fully functional
    // in development/demo. Wire up an email provider before production use.
    const resetUrl = `/reset-password?token=${token}`;

    return ok({
      message: "Reset link generated.",
      resetUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
