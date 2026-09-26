import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators";
import { ok, fail, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness, assertOwnership, ApiError } from "@/lib/session";

async function getOwnedProduct(id: string, businessId: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ApiError(404, "Product not found");
  assertOwnership(product.businessId, businessId);
  return product;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "products:view");
    const product = await getOwnedProduct(params.id, business.id);
    const full = await prisma.product.findUnique({
      where: { id: product.id },
      include: { category: true },
    });
    return ok(full);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "products:manage");
    const existing = await getOwnedProduct(params.id, business.id);

    const body = await req.json();
    const data = productSchema.partial().parse(body);

    if (data.sku && data.sku !== existing.sku) {
      const clash = await prisma.product.findUnique({
        where: { businessId_sku: { businessId: business.id, sku: data.sku } },
      });
      if (clash) return fail("A product with this SKU already exists", 409);
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.buyingPrice !== undefined && { buyingPrice: data.buyingPrice }),
        ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
        ...(data.wholesalePrice !== undefined && { wholesalePrice: data.wholesalePrice }),
        ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await prisma.auditLog.create({
      data: { businessId: business.id, userId, action: "UPDATED", entity: "Product", entityId: params.id },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// Soft delete (deactivate) to preserve sale history integrity.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "products:manage");
    await getOwnedProduct(params.id, business.id);

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: { businessId: business.id, userId, action: "DELETED", entity: "Product", entityId: params.id },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
