import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness } from "@/lib/session";
import { resolveRange, toCsv, RangeKey } from "@/lib/date-range";
import { toNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "reports:view");
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get("range") as RangeKey) || "today";
    const { from, to } = resolveRange(range, searchParams.get("from"), searchParams.get("to"));
    const format = searchParams.get("format");

    const sales = await prisma.sale.findMany({
      where: {
        businessId: business.id,
        status: { not: "CANCELLED" },
        createdAt: { gte: from, lte: to },
      },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });

    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((s, x) => s + toNumber(x.total), 0),
      totalDiscount: sales.reduce((s, x) => s + toNumber(x.discount), 0),
      totalCost: sales.reduce((s, x) => s + toNumber(x.totalCost), 0),
      totalGrossProfit: sales.reduce((s, x) => s + toNumber(x.grossProfit), 0),
    };

    if (format === "csv") {
      const rows = sales.map((s) => ({
        Invoice: s.invoiceNumber,
        Date: s.createdAt.toISOString(),
        Customer: s.customer?.name ?? "Walk-in",
        SaleType: s.saleType,
        Subtotal: toNumber(s.subtotal),
        Discount: toNumber(s.discount),
        Total: toNumber(s.total),
        Cost: toNumber(s.totalCost),
        GrossProfit: toNumber(s.grossProfit),
        PaymentMethod: s.paymentMethod,
        PaymentStatus: s.paymentStatus,
        Status: s.status,
      }));
      const csv = toCsv(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="sales-report-${range}.csv"`,
        },
      });
    }

    return ok({ sales, summary, range: { from, to } });
  } catch (error) {
    return handleApiError(error);
  }
}
