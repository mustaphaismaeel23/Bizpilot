import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness } from "@/lib/session";
import { toCsv } from "@/lib/date-range";
import { toNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    const customers = await prisma.customer.findMany({
      where: { businessId: business.id },
      include: {
        sales: { where: { status: { not: "CANCELLED" } }, select: { total: true, balance: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = customers.map((c) => ({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      totalPurchases: c.sales.reduce((s, x) => s + toNumber(x.total), 0),
      outstandingDebt: c.sales.reduce((s, x) => s + toNumber(x.balance), 0),
      salesCount: c.sales.length,
    }));

    const summary = {
      totalCustomers: customers.length,
      totalOutstandingDebt: rows.reduce((s, r) => s + r.outstandingDebt, 0),
      totalRevenue: rows.reduce((s, r) => s + r.totalPurchases, 0),
    };

    if (format === "csv") {
      const csv = toCsv(
        rows.map((r) => ({
          Name: r.name,
          Phone: r.phone,
          Email: r.email,
          TotalPurchases: r.totalPurchases,
          OutstandingDebt: r.outstandingDebt,
          SalesCount: r.salesCount,
        }))
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="customer-report.csv"`,
        },
      });
    }

    return ok({ customers: rows, summary });
  } catch (error) {
    return handleApiError(error);
  }
}
