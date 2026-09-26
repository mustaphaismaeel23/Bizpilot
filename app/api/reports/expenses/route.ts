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
    const range = (searchParams.get("range") as RangeKey) || "month";
    const { from, to } = resolveRange(range, searchParams.get("from"), searchParams.get("to"));
    const format = searchParams.get("format");

    const expenses = await prisma.expense.findMany({
      where: { businessId: business.id, date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
    });

    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + toNumber(e.amount));
    }

    const summary = {
      total: expenses.reduce((s, e) => s + toNumber(e.amount), 0),
      count: expenses.length,
      byCategory: Array.from(byCategory.entries()).map(([category, total]) => ({ category, total })),
    };

    if (format === "csv") {
      const rows = expenses.map((e) => ({
        Date: e.date.toISOString(),
        Category: e.category,
        Description: e.description ?? "",
        Amount: toNumber(e.amount),
      }));
      const csv = toCsv(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="expense-report-${range}.csv"`,
        },
      });
    }

    return ok({ expenses, summary, range: { from, to } });
  } catch (error) {
    return handleApiError(error);
  }
}
