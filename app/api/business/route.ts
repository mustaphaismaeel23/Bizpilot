import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { businessOnboardingSchema } from "@/lib/validators";
import { ok, fail, handleApiError } from "@/lib/api";
import { requireUserId, ApiError } from "@/lib/session";

// GET: return the caller's business, or null if onboarding is not complete.
export async function GET() {
  try {
    const userId = await requireUserId();
    const membership = await prisma.businessUser.findFirst({
      where: { userId },
      include: { business: true },
      orderBy: { createdAt: "asc" },
    });
    return ok(membership?.business ?? null);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: create the business during first-time onboarding.
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();

    const existing = await prisma.businessUser.findFirst({ where: { userId } });
    if (existing) {
      return fail("You already have a business set up", 409);
    }

    const body = await req.json();
    const data = businessOnboardingSchema.parse(body);

    const business = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.business.create({
        data: {
          ownerId: userId,
          name: data.name.trim(),
          category: data.category,
          phone: data.phone,
          address: data.address,
          currency: data.currency || "NGN",
          logo: data.logo,
        },
      });

      await tx.businessUser.create({
        data: { businessId: created.id, userId, role: "OWNER" },
      });

      await tx.auditLog.create({
        data: {
          businessId: created.id,
          userId,
          action: "CREATED",
          entity: "Business",
          entityId: created.id,
        },
      });

      return created;
    });

    return ok(business, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: update business profile (settings page).
export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const membership = await prisma.businessUser.findFirst({ where: { userId } });
    if (!membership) throw new ApiError(404, "No business found");

    const body = await req.json();
    const data = businessOnboardingSchema.partial().parse(body);

    const updated = await prisma.business.update({
      where: { id: membership.businessId },
      data,
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
