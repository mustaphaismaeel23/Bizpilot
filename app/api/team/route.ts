import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createStaffSchema } from "@/lib/validators";
import { ok, fail, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness } from "@/lib/session";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "team:manage");
    const members = await prisma.businessUser.findMany({
      where: { businessId: business.id, role: { not: "OWNER" } },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: "asc" },
    });
    const activity = members.length
      ? await prisma.auditLog.groupBy({
          by: ["userId"],
          where: { businessId: business.id, userId: { in: members.map((member) => member.userId) } },
          _count: { _all: true },
          _max: { createdAt: true },
        })
      : [];
    const activityByUser = new Map(activity.map((entry) => [entry.userId, entry]));

    return ok(members.map((member) => {
      const stats = activityByUser.get(member.userId);
      return {
        id: member.id,
        role: member.role,
        isActive: member.isActive,
        createdAt: member.createdAt,
        user: member.user,
        activityCount: stats?._count._all ?? 0,
        lastActivityAt: stats?._max.createdAt ?? null,
      };
    }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ownerId = await requireUserId();
    const { business } = await requireBusiness(ownerId, "team:manage");
    const data = createStaffSchema.parse(await req.json());
    const email = data.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const membership = await prisma.businessUser.findFirst({ where: { userId: existingUser.id } });
      return fail(
        membership ? "This account already belongs to a business" : "An account with this email already exists",
        409
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const member = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name.trim(),
          email,
          phone: data.phone?.trim() || null,
          passwordHash,
        },
      });
      const membership = await tx.businessUser.create({
        data: { businessId: business.id, userId: user.id, role: data.role },
      });
      await tx.auditLog.create({
        data: {
          businessId: business.id,
          userId: ownerId,
          action: "STAFF_CREATED",
          entity: "BusinessUser",
          entityId: membership.id,
          metadata: { email, role: data.role },
        },
      });
      return { ...membership, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } };
    });

    return ok(member, 201);
  } catch (error) {
    return handleApiError(error);
  }
}