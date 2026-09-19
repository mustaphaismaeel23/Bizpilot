"use client";

import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TrendingUp, Wallet, Receipt, Package, AlertTriangle, Users, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useBusiness } from "@/components/shared/business-context";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney } from "@/lib/utils";

interface DashboardData {
  currency: string;
  todayRevenue: number;
  todayGrossProfit: number;
  todayExpenseTotal: number;
  todayNetResult: number;
  todaySalesCount: number;
  totalProducts: number;
  lowStockCount: number;
  lowStockProducts: { id: string; name: string; quantity: number }[];
  totalCustomers: number;
  outstandingDebt: number;
  chart: { date: string; label: string; sales: number; profit: number }[];
  topProducts: { name: string; unitsSold: number; revenue: number; grossProfit: number }[];
}

export default function DashboardPage() {
  const business = useBusiness();
  const { data, loading } = useFetch<DashboardData>("/api/dashboard");
  const currency = business.currency;

  return (
    <div>
      <PageHeader
        title={`Welcome back to ${business.name}`}
        description="Here's how your business is doing today."
        actions={
          <Button asChild>
            <Link href="/dashboard/sales/new">New Sale</Link>
          </Button>
        }
      />

      {loading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today's Sales" value={formatMoney(data.todayRevenue, currency)} icon={TrendingUp} />
            <StatCard
              label="Today's Gross Profit"
              value={formatMoney(data.todayGrossProfit, currency)}
              icon={Wallet}
              tone="success"
            />
            <StatCard
              label="Today's Expenses"
              value={formatMoney(data.todayExpenseTotal, currency)}
              icon={Receipt}
              tone="warning"
            />
            <StatCard
              label="Today's Net Result"
              value={formatMoney(data.todayNetResult, currency)}
              icon={Wallet}
              tone={data.todayNetResult >= 0 ? "success" : "destructive"}
              sub={`${data.todaySalesCount} sale(s) today`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
            <StatCard label="Total Products" value={String(data.totalProducts)} icon={Package} />
            <StatCard
              label="Low Stock Products"
              value={String(data.lowStockCount)}
              icon={AlertTriangle}
              tone={data.lowStockCount > 0 ? "warning" : "default"}
            />
            <StatCard label="Total Customers" value={String(data.totalCustomers)} icon={Users} />
            <StatCard
              label="Outstanding Debt"
              value={formatMoney(data.outstandingDebt, currency)}
              icon={Wallet}
              tone={data.outstandingDebt > 0 ? "destructive" : "default"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3 mt-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sales — Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} width={70} tickFormatter={(v) => formatMoney(v, currency)} />
                    <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                    <Line type="monotone" dataKey="sales" name="Sales" stroke="hsl(158 64% 32%)" strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(38 92% 50%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Low Stock</CardTitle>
                <Link href="/dashboard/inventory" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  View Inventory <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {data.lowStockProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All products are well stocked.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.lowStockProducts.map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{p.name}</span>
                        <span className="font-medium text-warning shrink-0">{p.quantity} remaining</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Top Selling Products (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topProducts.length === 0 ? (
                <EmptyState icon={Package} title="No sales yet" description="Record your first sale to see top products here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 font-medium">Product</th>
                        <th className="py-2 font-medium">Units Sold</th>
                        <th className="py-2 font-medium">Revenue</th>
                        <th className="py-2 font-medium">Gross Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p) => (
                        <tr key={p.name} className="border-b last:border-0">
                          <td className="py-2.5">{p.name}</td>
                          <td className="py-2.5">{p.unitsSold}</td>
                          <td className="py-2.5">{formatMoney(p.revenue, currency)}</td>
                          <td className="py-2.5">{formatMoney(p.grossProfit, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
