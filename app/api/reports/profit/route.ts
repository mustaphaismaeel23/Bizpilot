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

    const [sales, expenseAgg] = await Promise.all([
      prisma.sale.findMany({
        where: { businessId: business.id, status: "COMPLETED", createdAt: { gte: from, lte: to } },
      }),
      prisma.expense.aggregate({
        where: { businessId: business.id, date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
    ]);

    const revenue = sales.reduce((s, x) => s + toNumber(x.total), 0);
    const cost = sales.reduce((s, x) => s + toNumber(x.totalCost), 0);
    const grossProfit = revenue - cost;
    const expenses = toNumber(expenseAgg._sum.amount ?? 0);
    const netResult = grossProfit - expenses;

    const summary = { revenue, cost, grossProfit, expenses, netResult, marginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0 };

    if (format === "csv") {
      const csv = toCsv([
        { Metric: "Revenue", Value: revenue },
        { Metric: "Cost of Goods", Value: cost },
        { Metric: "Gross Profit", Value: grossProfit },
        { Metric: "Expenses", Value: expenses },
        { Metric: "Net Result", Value: netResult },
      ]);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="profit-report-${range}.csv"`,
        },
      });
    }

    return ok({ summary, range: { from, to } });
  } catch (error) {
    return handleApiError(error);
  }
}
