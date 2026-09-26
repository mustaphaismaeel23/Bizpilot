"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Eye, Printer, Ban, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useBusiness } from "@/components/shared/business-context";
import { useFetch, apiRequest } from "@/hooks/use-fetch";
import { useToast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";

interface Sale {
  id: string;
  invoiceNumber: string;
  total: string;
  saleType: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
  customer: { name: string } | null;
}

export default function SalesHistoryPage() {
  const business = useBusiness();
  const canManageSales = business.role !== "STAFF";
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search) query.set("q", search);
  if (status !== "all") query.set("status", status);
  if (paymentMethod !== "all") query.set("paymentMethod", paymentMethod);

  const { data, loading, refetch } = useFetch<{ items: Sale[]; total: number; pageSize: number }>(
    `/api/sales?${query.toString()}`,
    [search, status, paymentMethod, page]
  );

  const handleCancel = async (sale: Sale) => {
    const yes = await confirm({
      title: `Cancel invoice ${sale.invoiceNumber}?`,
      description: "Stock will be restored for all items in this sale.",
      destructive: true,
    });
    if (!yes) return;
    try {
      await apiRequest(`/api/sales/${sale.id}/cancel`, { method: "POST" });
      toast({ title: "Sale cancelled", variant: "success" });
      refetch();
    } catch (e) {
      toast({ title: "Failed to cancel", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="Sales"
        description="View and manage all sales transactions."
        actions={
          canManageSales ? <Button asChild>
            <Link href="/dashboard/sales/new">
              <Plus className="h-4 w-4" /> New Sale
            </Link>
          </Button> : undefined
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice or customer..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No sales yet"
              description="Record your first sale to see it here."
              actionLabel={canManageSales ? "New Sale" : undefined}
              onAction={canManageSales ? () => (window.location.href = "/dashboard/sales/new") : undefined}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.invoiceNumber}</TableCell>
                      <TableCell>{s.customer?.name ?? "Walk-in"}</TableCell>
                      <TableCell>{s.saleType === "WHOLESALE" ? "Wholesale" : "Retail"}</TableCell>
                      <TableCell>{formatMoney(s.total, business.currency)}</TableCell>
                      <TableCell>{s.paymentMethod}</TableCell>
                      <TableCell>
                        <StatusBadge status={s.status === "COMPLETED" ? s.paymentStatus : s.status} />
                      </TableCell>
                      <TableCell>{format(new Date(s.createdAt), "dd MMM yyyy, HH:mm")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/sales/${s.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/sales/${s.id}?print=1`}>
                            <Printer className="h-4 w-4" />
                          </Link>
                        </Button>
                        {canManageSales && s.status === "COMPLETED" && (
                          <Button variant="ghost" size="icon" onClick={() => handleCancel(s)}>
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} · {data.total} total
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {ConfirmDialog}
    </div>
  );
}
