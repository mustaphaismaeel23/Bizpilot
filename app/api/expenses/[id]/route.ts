import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validators";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness, assertOwnership, ApiError } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "expenses:manage");

    const existing = await prisma.expense.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Expense not found");
    assertOwnership(existing.businessId, business.id);

    const body = await req.json();
    const data = expenseSchema.partial().parse(body);

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data,
    });

    await prisma.auditLog.create({
      data: { businessId: business.id, userId, action: "UPDATED", entity: "Expense", entityId: params.id },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "expenses:manage");

    const existing = await prisma.expense.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Expense not found");
    assertOwnership(existing.businessId, business.id);

    await prisma.expense.delete({ where: { id: params.id } });
    await prisma.auditLog.create({
      data: { businessId: business.id, userId, action: "DELETED", entity: "Expense", entityId: params.id },
    });

    return ok({ id: params.id });
  } catch (error) {
    return handleApiError(error);
  }
}
