import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness, assertOwnership, ApiError } from "@/lib/session";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    if (!sale) throw new ApiError(404, "Sale not found");
    assertOwnership(sale.businessId, business.id);

    if (sale.status !== "COMPLETED") {
      return fail("Only completed sales can be cancelled", 422);
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.sale.update({ where: { id: sale.id }, data: { status: "CANCELLED" } });

      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });

        await tx.inventoryTransaction.create({
          data: {
            businessId: business.id,
            productId: item.productId,
            userId,
            saleId: sale.id,
            type: "RETURN",
            quantity: item.quantity,
            reference: `Cancelled ${sale.invoiceNumber}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          businessId: business.id,
          userId,
          action: "CANCELLED",
          entity: "Sale",
          entityId: sale.id,
        },
      });
    });

    return ok({ id: sale.id, status: "CANCELLED" });
  } catch (error) {
    return handleApiError(error);
  }
}
