import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validators";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness } from "@/lib/session";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);

    const categories = await prisma.category.findMany({
      where: { businessId: business.id },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });

    return ok(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);
    const body = await req.json();
    const data = categorySchema.parse(body);

    const category = await prisma.category.create({
      data: { businessId: business.id, name: data.name.trim() },
    });

    await prisma.auditLog.create({
      data: {
        businessId: business.id,
        userId,
        action: "CREATED",
        entity: "Category",
        entityId: category.id,
      },
    });

    return ok(category, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
