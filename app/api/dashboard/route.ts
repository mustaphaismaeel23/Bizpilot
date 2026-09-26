import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness } from "@/lib/session";
import { toNumber } from "@/lib/utils";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "dashboard:view");
    const businessId = business.id;

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [todaySales, todayExpenses, totalProducts, lowStockProducts, totalCustomers, allSales] =
      await Promise.all([
        prisma.sale.findMany({
          where: { businessId, status: "COMPLETED", createdAt: { gte: todayStart, lte: todayEnd } },
        }),
        prisma.expense.aggregate({
          where: { businessId, date: { gte: todayStart, lte: todayEnd } },
          _sum: { amount: true },
        }),
        prisma.product.count({ where: { businessId, isActive: true } }),
        prisma.product.findMany({
          where: { businessId, isActive: true },
          select: { id: true, name: true, quantity: true, lowStockThreshold: true },
        }),
        prisma.customer.count({ where: { businessId } }),
        prisma.sale.aggregate({
          where: { businessId, status: { not: "CANCELLED" }, paymentStatus: { not: "PAID" } },
          _sum: { balance: true },
        }),
      ]);

    const todayRevenue = todaySales.reduce((sum, s) => sum + toNumber(s.total), 0);
    const todayGrossProfit = todaySales.reduce((sum, s) => sum + toNumber(s.grossProfit), 0);
    const todayExpenseTotal = toNumber(todayExpenses._sum.amount ?? 0);
    const todayNetResult = todayGrossProfit - todayExpenseTotal;
    const outstandingDebt = toNumber(allSales._sum.balance ?? 0);

    const lowStock = lowStockProducts.filter((p) => p.quantity <= p.lowStockThreshold);

    // 7-day sales chart
    const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
    const weekSales = await prisma.sale.findMany({
      where: { businessId, status: "COMPLETED", createdAt: { gte: sevenDaysAgo } },
      select: { total: true, grossProfit: true, createdAt: true },
    });

    const chart = Array.from({ length: 7 }).map((_, i) => {
      const day = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const daySales = weekSales.filter((s) => s.createdAt >= dayStart && s.createdAt <= dayEnd);
      return {
        date: format(day, "yyyy-MM-dd"),
        label: format(day, "EEE"),
        sales: daySales.reduce((sum, s) => sum + toNumber(s.total), 0),
        profit: daySales.reduce((sum, s) => sum + toNumber(s.grossProfit), 0),
      };
    });

    // Top selling products (last 30 days)
    const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: { businessId, status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } },
      },
      include: { product: true },
    });

    const productAgg = new Map<
      string,
      { name: string; unitsSold: number; revenue: number; grossProfit: number }
    >();
    for (const item of saleItems) {
      const existing = productAgg.get(item.productId) ?? {
        name: item.product.name,
        unitsSold: 0,
        revenue: 0,
        grossProfit: 0,
      };
      existing.unitsSold += item.quantity;
      existing.revenue += toNumber(item.subtotal);
      existing.grossProfit += toNumber(item.profit);
      productAgg.set(item.productId, existing);
    }
    const topProducts = Array.from(productAgg.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return ok({
      currency: business.currency,
      todayRevenue,
      todayGrossProfit,
      todayExpenseTotal,
      todayNetResult,
      todaySalesCount: todaySales.length,
      totalProducts,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock.slice(0, 6),
      totalCustomers,
      outstandingDebt,
      chart,
      topProducts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
