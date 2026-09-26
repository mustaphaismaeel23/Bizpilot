"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer, Download, Share2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { useBusiness } from "@/components/shared/business-context";
import { useFetch } from "@/hooks/use-fetch";
import { useToast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";

interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  product: { name: string; sku: string };
}
interface SaleDetail {
  id: string;
  invoiceNumber: string;
  subtotal: string;
  discount: string;
  total: string;
  amountPaid: string;
  balance: string;
  saleType: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
  items: SaleItem[];
  customer: { name: string; phone: string | null } | null;
  user: { name: string };
  business: { name: string; address: string | null; phone: string | null; currency: string };
}

export default function SaleReceiptPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const business = useBusiness();
  const { toast } = useToast();
  const { data, loading } = useFetch<SaleDetail>(`/api/sales/${params.id}`);

  useEffect(() => {
    if (searchParams.get("print") === "1" && data) {
      setTimeout(() => window.print(), 300);
    }
  }, [searchParams, data]);

  const handleDownload = () => {
    if (!data) return;
    const html = document.getElementById("receipt-area")?.outerHTML ?? "";
    const blob = new Blob(
      [`<html><head><title>${data.invoiceNumber}</title></head><body>${html}</body></html>`],
      { type: "text/html" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) {
    return <Skeleton className="h-96 w-full max-w-lg mx-auto" />;
  }

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-6 max-w-lg mx-auto">
        <Link href="/dashboard/sales" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to sales
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast({ title: "Sharing coming soon", description: "Direct receipt sharing will be available in a future update." })}
          >
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      <Card className="max-w-lg mx-auto print-area" id="receipt-area">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center gap-1.5 text-success mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">SALE COMPLETED</span>
            </div>
            <h2 className="text-xl font-bold">{data.business.name}</h2>
            {data.business.address && <p className="text-sm text-muted-foreground">{data.business.address}</p>}
            {data.business.phone && <p className="text-sm text-muted-foreground">{data.business.phone}</p>}
          </div>

          <div className="flex justify-between text-sm mb-4">
            <div>
              <p className="text-muted-foreground">Invoice</p>
              <p className="font-medium">{data.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(data.createdAt), "dd MMM yyyy, HH:mm")}</p>
            </div>
          </div>

          <div className="text-sm mb-4">
            <p className="text-muted-foreground">Sale type</p>
            <p className="font-medium">{data.saleType === "WHOLESALE" ? "Wholesale" : "Retail"}</p>
          </div>

          <div className="text-sm mb-4">
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium">{data.customer?.name ?? "Walk-in customer"}</p>
          </div>

          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 font-medium text-center">Qty</th>
                <th className="py-2 font-medium text-right">Price</th>
                <th className="py-2 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">{item.product.name}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{formatMoney(item.unitPrice, business.currency)}</td>
                  <td className="py-2 text-right">{formatMoney(item.subtotal, business.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatMoney(data.subtotal, business.currency)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span>-{formatMoney(data.discount, business.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1.5 border-t">
              <span>Total</span>
              <span>{formatMoney(data.total, business.currency)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{data.paymentStatus === "PARTIAL" ? "Deposit received" : "Amount paid"}</span>
              <span>{formatMoney(data.amountPaid, business.currency)}</span>
            </div>
            {parseFloat(data.balance) > 0 && (
              <div className="flex justify-between text-destructive font-medium">
                <span>Remaining balance due</span>
                <span>{formatMoney(data.balance, business.currency)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
            <span className="text-muted-foreground">Payment Method</span>
            <span className="font-medium">{data.paymentMethod}</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-sm">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={data.status === "COMPLETED" ? data.paymentStatus : data.status} />
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">Served by {data.user.name} · Thank you for your patronage!</p>
        </CardContent>
      </Card>
    </div>
  );
}
