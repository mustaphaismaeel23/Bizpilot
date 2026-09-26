import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness } from "@/lib/session";
import { toCsv } from "@/lib/date-range";
import { toNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "reports:view");
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    const products = await prisma.product.findMany({
      where: { businessId: business.id },
      include: { category: true },
      orderBy: { name: "asc" },
    });

    const summary = {
      totalProducts: products.length,
      totalStockValue: products.reduce((s, p) => s + toNumber(p.buyingPrice) * p.quantity, 0),
      totalRetailValue: products.reduce((s, p) => s + toNumber(p.sellingPrice) * p.quantity, 0),
      lowStock: products.filter((p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold).length,
      outOfStock: products.filter((p) => p.quantity <= 0).length,
    };

    if (format === "csv") {
      const rows = products.map((p) => ({
        Name: p.name,
        SKU: p.sku,
        Category: p.category?.name ?? "",
        Stock: p.quantity,
        BuyingPrice: toNumber(p.buyingPrice),
        SellingPrice: toNumber(p.sellingPrice),
        StockValue: toNumber(p.buyingPrice) * p.quantity,
        Status: p.quantity <= 0 ? "OUT OF STOCK" : p.quantity <= p.lowStockThreshold ? "LOW STOCK" : "IN STOCK",
      }));
      const csv = toCsv(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="inventory-report.csv"`,
        },
      });
    }

    return ok({ products, summary });
  } catch (error) {
    return handleApiError(error);
  }
}
