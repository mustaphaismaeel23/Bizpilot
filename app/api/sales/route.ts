import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSaleSchema } from "@/lib/validators";
import { ok, fail, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness, ApiError } from "@/lib/session";
import { generateInvoiceNumber, toNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");
    const paymentMethod = searchParams.get("paymentMethod");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "20", 10));

    const where: Prisma.SaleWhereInput = { businessId: business.id };
    if (status) where.status = status as Prisma.EnumSaleStatusFilter["equals"];
    if (paymentMethod) where.paymentMethod = paymentMethod as Prisma.EnumPaymentMethodFilter["equals"];
    if (from || to) {
      where.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
      };
    }
    if (q) {
      where.OR = [
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { customer: true, items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sale.count({ where }),
    ]);

    return ok({ items, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);
    const body = await req.json();
    const data = createSaleSchema.parse(body);

    if (data.paymentMethod === "CREDIT" && !data.customerId) {
      return fail("A customer must be selected for credit sales", 422);
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const productIds = data.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, businessId: business.id },
      });

      if (products.length !== productIds.length) {
        throw new ApiError(404, "One or more products were not found");
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      let totalCost = 0;
      const itemsData: Prisma.SaleItemCreateManySaleInput[] = [];

      for (const item of data.items) {
        const product = productMap.get(item.productId)!;
        if (!product.isActive) {
          throw new ApiError(422, `${product.name} is not available for sale`);
        }
        if (product.quantity < item.quantity) {
          throw new ApiError(422, `Insufficient stock for ${product.name}. Only ${product.quantity} left.`);
        }

        const unitPrice = toNumber(product.sellingPrice);
        const buyingPrice = toNumber(product.buyingPrice);
        const lineSubtotal = unitPrice * item.quantity;
        const lineCost = buyingPrice * item.quantity;

        subtotal += lineSubtotal;
        totalCost += lineCost;

        itemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          buyingPrice,
          subtotal: lineSubtotal,
          cost: lineCost,
          profit: lineSubtotal - lineCost,
        });
      }

      const discount = Math.min(data.discount, subtotal);
      const total = subtotal - discount;
      const grossProfit = total - totalCost;

      let amountPaid = data.paymentMethod === "CREDIT" ? data.amountPaid ?? 0 : total;
      amountPaid = Math.min(amountPaid, total);
      const balance = total - amountPaid;
      const paymentStatus = balance <= 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID";

      let invoiceNumber = generateInvoiceNumber();
      // Extremely unlikely collision guard.
      for (let attempt = 0; attempt < 3; attempt++) {
        const clash = await tx.sale.findUnique({
          where: { businessId_invoiceNumber: { businessId: business.id, invoiceNumber } },
        });
        if (!clash) break;
        invoiceNumber = generateInvoiceNumber();
      }

      const sale = await tx.sale.create({
        data: {
          businessId: business.id,
          customerId: data.customerId || null,
          userId,
          invoiceNumber,
          subtotal,
          discount,
          total,
          totalCost,
          grossProfit,
          amountPaid,
          balance,
          paymentMethod: data.paymentMethod,
          paymentStatus,
          status: "COMPLETED",
          items: { createMany: { data: itemsData } },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });

        await tx.inventoryTransaction.create({
          data: {
            businessId: business.id,
            productId: item.productId,
            userId,
            saleId: sale.id,
            type: "SALE",
            quantity: -item.quantity,
            reference: sale.invoiceNumber,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          businessId: business.id,
          userId,
          action: "CREATED",
          entity: "Sale",
          entityId: sale.id,
          metadata: { invoiceNumber: sale.invoiceNumber, total },
        },
      });

      await tx.notification.create({
        data: {
          businessId: business.id,
          userId,
          type: "SALE_COMPLETED",
          title: "Sale completed",
          message: `Invoice ${sale.invoiceNumber} for ${total.toLocaleString()} was recorded.`,
        },
      });

      if (data.paymentMethod === "CREDIT" && balance > 0) {
        await tx.notification.create({
          data: {
            businessId: business.id,
            userId,
            type: "CUSTOMER_CREDIT",
            title: "Customer credit recorded",
            message: `A balance of ${balance.toLocaleString()} was recorded on invoice ${sale.invoiceNumber}.`,
          },
        });
      }

      // Low stock check for anything that just crossed the threshold.
      const updatedProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      for (const p of updatedProducts) {
        if (p.quantity <= p.lowStockThreshold) {
          await tx.notification.create({
            data: {
              businessId: business.id,
              userId,
              type: "LOW_STOCK",
              title: "Low stock alert",
              message: `${p.name} is ${p.quantity <= 0 ? "out of stock" : `low on stock (${p.quantity} left)`}.`,
            },
          });
        }
      }

      return sale;
    });

    return ok(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
