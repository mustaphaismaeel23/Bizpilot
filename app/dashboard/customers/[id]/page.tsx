"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Receipt, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useBusiness } from "@/components/shared/business-context";
import { useFetch, apiRequest } from "@/hooks/use-fetch";
import { useToast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";

interface Sale {
  id: string;
  invoiceNumber: string;
  total: string;
  balance: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
}
interface CustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  sales: Sale[];
}

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const business = useBusiness();
  const { toast } = useToast();
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingSale, setPayingSale] = useState<Sale | null>(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, loading, refetch } = useFetch<CustomerDetail>(`/api/customers/${params.id}`);

  const outstandingDebt =
    data?.sales.filter((s) => s.status !== "CANCELLED").reduce((sum, s) => sum + parseFloat(s.balance), 0) ?? 0;
  const totalPurchases =
    data?.sales.filter((s) => s.status !== "CANCELLED").reduce((sum, s) => sum + parseFloat(s.total), 0) ?? 0;

  const openPay = (sale: Sale) => {
    setPayingSale(sale);
    setAmount(sale.balance);
    setPayDialogOpen(true);
  };

  const submitPayment = async () => {
    if (!payingSale) return;
    setSaving(true);
    try {
      await apiRequest("/api/debt-payments", {
        method: "POST",
        body: { saleId: payingSale.id, amount: parseFloat(amount) },
      });
      toast({ title: "Payment recorded", variant: "success" });
      setPayDialogOpen(false);
      refetch();
    } catch (e) {
      toast({ title: "Failed to record payment", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div>
      <Link href="/dashboard/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      <PageHeader title={data.name} description={[data.phone, data.email, data.address].filter(Boolean).join(" · ") || "No contact details"} />

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="text-2xl font-bold mt-1">{formatMoney(totalPurchases, business.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Outstanding Debt</p>
            <p className={`text-2xl font-bold mt-1 ${outstandingDebt > 0 ? "text-destructive" : ""}`}>
              {formatMoney(outstandingDebt, business.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          {data.sales.length === 0 ? (
            <EmptyState icon={Receipt} title="No purchases yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/dashboard/sales/${s.id}`} className="text-primary hover:underline font-medium">
                        {s.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{format(new Date(s.createdAt), "dd MMM yyyy")}</TableCell>
                    <TableCell>{formatMoney(s.total, business.currency)}</TableCell>
                    <TableCell>{formatMoney(s.balance, business.currency)}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status === "COMPLETED" ? s.paymentStatus : s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status === "COMPLETED" && parseFloat(s.balance) > 0 && (
                        <Button size="sm" variant="outline" onClick={() => openPay(s)}>
                          <Wallet className="h-3.5 w-3.5" /> Record Payment
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment — {payingSale?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Amount ({business.currency})</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Outstanding balance: {payingSale && formatMoney(payingSale.balance, business.currency)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPayment} loading={saving}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
