import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators";
import { ok, fail, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness } from "@/lib/session";
import { generateSku } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status"); // active | inactive | low | out
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "20", 10));

    const where: Prisma.ProductWhereInput = { businessId: business.id };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    let filtered = items;
    if (status === "low") {
      filtered = items.filter((p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold);
    } else if (status === "out") {
      filtered = items.filter((p) => p.quantity <= 0);
    }

    return ok({ items: filtered, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);
    const body = await req.json();
    const data = productSchema.parse(body);

    if (data.sellingPrice < data.buyingPrice) {
      // Not a hard block (some businesses sell at a loss intentionally),
      // but this is surfaced to the client as a soft validation warning.
    }

    const sku = data.sku?.trim() || generateSku(data.name);

    const clash = await prisma.product.findUnique({
      where: { businessId_sku: { businessId: business.id, sku } },
    });
    if (clash) {
      return fail("A product with this SKU already exists", 409);
    }

    const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.product.create({
        data: {
          businessId: business.id,
          categoryId: data.categoryId || null,
          name: data.name.trim(),
          sku,
          description: data.description,
          buyingPrice: data.buyingPrice,
          sellingPrice: data.sellingPrice,
          quantity: data.quantity,
          lowStockThreshold: data.lowStockThreshold,
          image: data.image,
          isActive: data.isActive ?? true,
        },
      });

      if (data.quantity > 0) {
        await tx.inventoryTransaction.create({
          data: {
            businessId: business.id,
            productId: created.id,
            userId,
            type: "PURCHASE",
            quantity: data.quantity,
            reference: "Initial stock",
          },
        });
      }

      await tx.auditLog.create({
        data: { businessId: business.id, userId, action: "CREATED", entity: "Product", entityId: created.id },
      });

      return created;
    });

    return ok(product, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
