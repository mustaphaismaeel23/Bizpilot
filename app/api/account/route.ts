import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api";
import { requireUserId } from "@/lib/session";

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    });
    return ok(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    if (body.currentPassword || body.newPassword) {
      const data = passwordSchema.parse(body);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found");

      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!valid) return fail("Current password is incorrect", 422);

      const passwordHash = await bcrypt.hash(data.newPassword, 10);
      await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
      return ok({ message: "Password updated" });
    }

    const data = profileSchema.parse(body);
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, phone: true },
    });
    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
