import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validators";
import { ok, fail, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness, assertOwnership, ApiError } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "products:manage");

    const existing = await prisma.category.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Category not found");
    assertOwnership(existing.businessId, business.id);

    const body = await req.json();
    const data = categorySchema.parse(body);

    const updated = await prisma.category.update({
      where: { id: params.id },
      data: { name: data.name.trim() },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "products:manage");

    const existing = await prisma.category.findUnique({
      where: { id: params.id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw new ApiError(404, "Category not found");
    assertOwnership(existing.businessId, business.id);

    if (existing._count.products > 0) {
      return fail(
        "This category has products assigned to it. Reassign or remove those products before deleting.",
        409
      );
    }

    await prisma.category.delete({ where: { id: params.id } });
    await prisma.auditLog.create({
      data: { businessId: business.id, userId, action: "DELETED", entity: "Category", entityId: params.id },
    });

    return ok({ id: params.id });
  } catch (error) {
    return handleApiError(error);
  }
}
