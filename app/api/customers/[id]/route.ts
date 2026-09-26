import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validators";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness, assertOwnership, ApiError } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "customers:view");

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          include: { items: { include: { product: true } } },
        },
      },
    });
    if (!customer) throw new ApiError(404, "Customer not found");
    assertOwnership(customer.businessId, business.id);

    return ok(customer);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "customers:manage");

    const existing = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Customer not found");
    assertOwnership(existing.businessId, business.id);

    const body = await req.json();
    const data = customerSchema.partial().parse(body);

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address || null }),
      },
    });

    await prisma.auditLog.create({
      data: { businessId: business.id, userId, action: "UPDATED", entity: "Customer", entityId: params.id },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "customers:manage");

    const existing = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Customer not found");
    assertOwnership(existing.businessId, business.id);

    await prisma.customer.delete({ where: { id: params.id } });
    await prisma.auditLog.create({
      data: { businessId: business.id, userId, action: "DELETED", entity: "Customer", entityId: params.id },
    });

    return ok({ id: params.id });
  } catch (error) {
    return handleApiError(error);
  }
}
