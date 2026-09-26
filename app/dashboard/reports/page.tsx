"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useBusiness } from "@/components/shared/business-context";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";

const RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

function RangePicker({ range, setRange }: { range: string; setRange: (v: string) => void }) {
  return (
    <Select value={range} onValueChange={setRange}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ExportButton({ href }: { href: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={href}>
        <Download className="h-4 w-4" /> Export CSV
      </a>
    </Button>
  );
}

function SalesReportTab() {
  const business = useBusiness();
  const [range, setRange] = useState("today");
  const { data, loading } = useFetch<{
    sales: { id: string; invoiceNumber: string; total: string; grossProfit: string; saleType: string; paymentMethod: string; createdAt: string; customer: { name: string } | null }[];
    summary: { totalSales: number; totalRevenue: number; totalDiscount: number; totalGrossProfit: number };
  }>(`/api/reports/sales?range=${range}`, [range]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <RangePicker range={range} setRange={setRange} />
        <ExportButton href={`/api/reports/sales?range=${range}&format=csv`} />
      </div>
      {loading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryStat label="Total Sales" value={String(data.summary.totalSales)} />
            <SummaryStat label="Revenue" value={formatMoney(data.summary.totalRevenue, business.currency)} />
            <SummaryStat label="Discounts" value={formatMoney(data.summary.totalDiscount, business.currency)} />
            <SummaryStat label="Gross Profit" value={formatMoney(data.summary.totalGrossProfit, business.currency)} />
          </div>
          <Card>
            <CardContent className="p-4">
              {data.sales.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No sales in this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Gross Profit</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.invoiceNumber}</TableCell>
                        <TableCell>{s.customer?.name ?? "Walk-in"}</TableCell>
                        <TableCell>{s.saleType === "WHOLESALE" ? "Wholesale" : "Retail"}</TableCell>
                        <TableCell>{formatMoney(s.total, business.currency)}</TableCell>
                        <TableCell>{formatMoney(s.grossProfit, business.currency)}</TableCell>
                        <TableCell>{s.paymentMethod}</TableCell>
                        <TableCell>{format(new Date(s.createdAt), "dd MMM yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ProfitReportTab() {
  const business = useBusiness();
  const [range, setRange] = useState("today");
  const { data, loading } = useFetch<{
    summary: { revenue: number; cost: number; grossProfit: number; expenses: number; netResult: number; marginPct: number };
  }>(`/api/reports/profit?range=${range}`, [range]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <RangePicker range={range} setRange={setRange} />
        <ExportButton href={`/api/reports/profit?range=${range}&format=csv`} />
      </div>
      {loading || !data ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryStat label="Revenue" value={formatMoney(data.summary.revenue, business.currency)} />
          <SummaryStat label="Cost of Goods" value={formatMoney(data.summary.cost, business.currency)} />
          <SummaryStat label="Gross Profit" value={formatMoney(data.summary.grossProfit, business.currency)} />
          <SummaryStat label="Expenses" value={formatMoney(data.summary.expenses, business.currency)} />
          <SummaryStat label="Net Result" value={formatMoney(data.summary.netResult, business.currency)} />
          <SummaryStat label="Gross Margin" value={`${data.summary.marginPct.toFixed(1)}%`} />
        </div>
      )}
    </div>
  );
}

function ExpenseReportTab() {
  const business = useBusiness();
  const [range, setRange] = useState("month");
  const { data, loading } = useFetch<{
    expenses: { id: string; category: string; description: string | null; amount: string; date: string }[];
    summary: { total: number; count: number; byCategory: { category: string; total: number }[] };
  }>(`/api/reports/expenses?range=${range}`, [range]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <RangePicker range={range} setRange={setRange} />
        <ExportButton href={`/api/reports/expenses?range=${range}&format=csv`} />
      </div>
      {loading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryStat label="Total Expenses" value={formatMoney(data.summary.total, business.currency)} />
            <SummaryStat label="Count" value={String(data.summary.count)} />
            {data.summary.byCategory.slice(0, 2).map((c) => (
              <SummaryStat key={c.category} label={c.category} value={formatMoney(c.total, business.currency)} />
            ))}
          </div>
          <Card>
            <CardContent className="p-4">
              {data.expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No expenses in this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{format(new Date(e.date), "dd MMM yyyy")}</TableCell>
                        <TableCell>{e.category}</TableCell>
                        <TableCell>{e.description || "—"}</TableCell>
                        <TableCell>{formatMoney(e.amount, business.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function InventoryReportTab() {
  const business = useBusiness();
  const { data, loading } = useFetch<{
    products: { id: string; name: string; sku: string; quantity: number; buyingPrice: string; sellingPrice: string; category: { name: string } | null }[];
    summary: { totalProducts: number; totalStockValue: number; totalRetailValue: number; lowStock: number; outOfStock: number };
  }>("/api/reports/inventory");

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <ExportButton href="/api/reports/inventory?format=csv" />
      </div>
      {loading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <SummaryStat label="Products" value={String(data.summary.totalProducts)} />
            <SummaryStat label="Stock Value" value={formatMoney(data.summary.totalStockValue, business.currency)} />
            <SummaryStat label="Retail Value" value={formatMoney(data.summary.totalRetailValue, business.currency)} />
            <SummaryStat label="Low Stock" value={String(data.summary.lowStock)} />
            <SummaryStat label="Out of Stock" value={String(data.summary.outOfStock)} />
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Stock Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.category?.name ?? "—"}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell>{formatMoney(parseFloat(p.buyingPrice) * p.quantity, business.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function CustomerReportTab() {
  const business = useBusiness();
  const { data, loading } = useFetch<{
    customers: { name: string; phone: string; totalPurchases: number; outstandingDebt: number; salesCount: number }[];
    summary: { totalCustomers: number; totalOutstandingDebt: number; totalRevenue: number };
  }>("/api/reports/customers");

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <ExportButton href="/api/reports/customers?format=csv" />
      </div>
      {loading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <SummaryStat label="Customers" value={String(data.summary.totalCustomers)} />
            <SummaryStat label="Revenue" value={formatMoney(data.summary.totalRevenue, business.currency)} />
            <SummaryStat label="Outstanding Debt" value={formatMoney(data.summary.totalOutstandingDebt, business.currency)} />
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Purchases</TableHead>
                    <TableHead>Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.customers.map((c) => (
                    <TableRow key={c.name + c.phone}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell>{formatMoney(c.totalPurchases, business.currency)}</TableCell>
                      <TableCell>{formatMoney(c.outstandingDebt, business.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold mt-0.5 truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales, profit, expense, inventory and customer reports."
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        }
      />

      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
          <SalesReportTab />
        </TabsContent>
        <TabsContent value="profit">
          <ProfitReportTab />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpenseReportTab />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryReportTab />
        </TabsContent>
        <TabsContent value="customers">
          <CustomerReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
