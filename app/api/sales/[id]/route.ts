import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness, assertOwnership, ApiError } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        customer: true,
        user: { select: { name: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!sale) throw new ApiError(404, "Sale not found");
    assertOwnership(sale.businessId, business.id);

    return ok({ ...sale, business });
  } catch (error) {
    return handleApiError(error);
  }
}
