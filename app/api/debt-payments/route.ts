import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { debtPaymentSchema } from "@/lib/validators";
import { ok, fail, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness, assertOwnership, ApiError } from "@/lib/session";
import { toNumber } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "sales:manage");
    const body = await req.json();
    const data = debtPaymentSchema.parse(body);

    const sale = await prisma.sale.findUnique({ where: { id: data.saleId } });
    if (!sale) throw new ApiError(404, "Sale not found");
    assertOwnership(sale.businessId, business.id);

    const currentBalance = toNumber(sale.balance);
    if (data.amount > currentBalance) {
      return fail(`Payment exceeds the outstanding balance of ${currentBalance}`, 422);
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.debtPayment.create({
        data: { saleId: sale.id, amount: data.amount, note: data.note },
      });

      const newAmountPaid = toNumber(sale.amountPaid) + data.amount;
      const newBalance = currentBalance - data.amount;
      const paymentStatus = newBalance <= 0 ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : "UNPAID";

      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: { amountPaid: newAmountPaid, balance: newBalance, paymentStatus },
      });

      await tx.auditLog.create({
        data: {
          businessId: business.id,
          userId,
          action: "PAYMENT_RECORDED",
          entity: "Sale",
          entityId: sale.id,
          metadata: { amount: data.amount },
        },
      });

      return updatedSale;
    });

    return ok(updated, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
