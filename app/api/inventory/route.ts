import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stockAdjustmentSchema } from "@/lib/validators";
import { ok, fail, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness, assertOwnership, ApiError } from "@/lib/session";

// GET: full inventory transaction history, optionally filtered by product.
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "inventory:view");

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { businessId: business.id, ...(productId && { productId }) },
      include: { product: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return ok(transactions);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: stock in / manual adjustment / return.
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "inventory:manage");
    const body = await req.json();
    const data = stockAdjustmentSchema.parse(body);

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new ApiError(404, "Product not found");
    assertOwnership(product.businessId, business.id);

    const newQuantity = product.quantity + data.quantity;
    if (newQuantity < 0) {
      return fail("This adjustment would make stock negative", 422);
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.product.update({
        where: { id: product.id },
        data: { quantity: newQuantity },
      });

      const txn = await tx.inventoryTransaction.create({
        data: {
          businessId: business.id,
          productId: product.id,
          userId,
          type: data.type,
          quantity: data.quantity,
          reference: data.reference,
        },
        include: { product: true },
      });

      await tx.auditLog.create({
        data: {
          businessId: business.id,
          userId,
          action: "STOCK_ADJUSTED",
          entity: "Product",
          entityId: product.id,
          metadata: { type: data.type, quantity: data.quantity },
        },
      });

      if (newQuantity <= product.lowStockThreshold) {
        await tx.notification.create({
          data: {
            businessId: business.id,
            userId,
            type: "LOW_STOCK",
            title: "Low stock alert",
            message: `${product.name} is ${newQuantity <= 0 ? "out of stock" : `low on stock (${newQuantity} left)`}.`,
          },
        });
      }

      return txn;
    });

    return ok(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
