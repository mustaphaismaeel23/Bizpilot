"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, ShoppingCart, User, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useBusiness } from "@/components/shared/business-context";
import { useFetch, apiRequest } from "@/hooks/use-fetch";
import { useToast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: string;
  wholesalePrice: string | null;
  quantity: number;
  isActive: boolean;
}
interface Customer {
  id: string;
  name: string;
  phone: string | null;
}
interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  maxQty: number;
  quantity: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const business = useBusiness();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [saleType, setSaleType] = useState<"RETAIL" | "WHOLESALE">("RETAIL");
  const [paymentMode, setPaymentMode] = useState<"FULL" | "DEPOSIT" | "CREDIT">("FULL");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "POS">("CASH");
  const [discount, setDiscount] = useState("0");
  const [amountPaid, setAmountPaid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: productsData, loading } = useFetch<{ items: Product[] }>(
    `/api/products?status=active&pageSize=100&q=${encodeURIComponent(search)}`,
    [search]
  );
  const { data: customers } = useFetch<Customer[]>("/api/customers");

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const discountNum = Math.min(parseFloat(discount) || 0, subtotal);
  const total = subtotal - discountNum;
  const depositNum = Math.max(0, parseFloat(amountPaid) || 0);

  const addToCart = (p: Product) => {
    if (saleType === "WHOLESALE" && p.wholesalePrice === null) {
      toast({ title: "Wholesale price not set", description: `Add a wholesale price for ${p.name} in Products first.`, variant: "destructive" });
      return;
    }
    if (p.quantity <= 0) {
      toast({ title: "Out of stock", description: `${p.name} has no stock available.`, variant: "destructive" });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.quantity) {
          toast({ title: "Stock limit reached", description: `Only ${p.quantity} of ${p.name} in stock.`, variant: "destructive" });
          return prev;
        }
        return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unitPrice: parseFloat(saleType === "WHOLESALE" ? p.wholesalePrice! : p.sellingPrice),
          maxQty: p.quantity,
          quantity: 1,
        },
      ];
    });
  };

  const changeSaleType = (nextType: "RETAIL" | "WHOLESALE") => {
    if (nextType === "WHOLESALE") {
      const missingPrice = cart.find((line) => {
        const product = productsData?.items.find((item) => item.id === line.productId);
        return !product || product.wholesalePrice === null;
      });
      if (missingPrice) {
        toast({ title: "Wholesale price not set", description: `Add a wholesale price for ${missingPrice.name} in Products first.`, variant: "destructive" });
        return;
      }
    }

    setSaleType(nextType);
    setCart((current) => current.map((line) => {
      const product = productsData?.items.find((item) => item.id === line.productId);
      if (!product) return line;
      return { ...line, unitPrice: parseFloat(nextType === "WHOLESALE" ? product.wholesalePrice! : product.sellingPrice) };
    }));
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const next = l.quantity + delta;
          if (next > l.maxQty) {
            toast({ title: "Stock limit reached", variant: "destructive" });
            return l;
          }
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const resetSale = () => {
    setCart([]);
    setCustomerId("");
    setSaleType("RETAIL");
    setPaymentMode("FULL");
    setPaymentMethod("CASH");
    setDiscount("0");
    setAmountPaid("");
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", description: "Add at least one product.", variant: "destructive" });
      return;
    }
    if (paymentMode !== "FULL" && !customerId) {
      toast({ title: "Select a customer", description: "A customer is required when a balance will remain.", variant: "destructive" });
      return;
    }
    if (paymentMode === "DEPOSIT" && (depositNum <= 0 || depositNum >= total)) {
      toast({ title: "Check the deposit amount", description: "Enter a deposit greater than zero and less than the sale total.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const sale = await apiRequest<{ id: string }>("/api/sales", {
        method: "POST",
        body: {
          customerId: customerId || null,
          saleType,
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          discount: discountNum,
          paymentMethod: paymentMode === "CREDIT" ? "CREDIT" : paymentMethod,
          amountPaid: paymentMode === "DEPOSIT" ? depositNum : paymentMode === "CREDIT" ? 0 : undefined,
        },
      });
      toast({ title: "Sale completed", variant: "success" });
      resetSale();
      router.push(`/dashboard/sales/${sale.id}`);
    } catch (e) {
      toast({ title: "Sale failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Sale" description="Search products, build the cart, and complete the sale." />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  className="pl-9 h-12 text-base"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : !productsData || productsData.items.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="No products found" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
                  {productsData.items.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={p.quantity <= 0 || (saleType === "WHOLESALE" && p.wholesalePrice === null)}
                      className="text-left rounded-lg border p-3 hover:border-primary hover:bg-accent/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <p className="font-medium text-sm line-clamp-2">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {saleType === "WHOLESALE"
                          ? p.wholesalePrice === null ? "Wholesale price not set" : formatMoney(p.wholesalePrice, business.currency)
                          : formatMoney(p.sellingPrice, business.currency)}
                      </p>
                      <Badge variant={p.quantity <= 0 ? "destructive" : "secondary"} className="mt-2">
                        {p.quantity} in stock
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4.5 w-4.5" /> Cart ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Tap a product to add it to the cart.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin mb-4">
                  {cart.map((l) => (
                    <div key={l.productId} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{formatMoney(l.unitPrice, business.currency)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.productId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{l.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.productId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <button onClick={() => removeLine(l.productId)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 border-t pt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Sale type</Label>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Sale type">
                    <Button type="button" variant={saleType === "RETAIL" ? "default" : "outline"} onClick={() => changeSaleType("RETAIL")}>
                      Retail
                    </Button>
                    <Button type="button" variant={saleType === "WHOLESALE" ? "default" : "outline"} onClick={() => changeSaleType("WHOLESALE")}>
                      Wholesale
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <User className="h-3.5 w-3.5" /> Customer {paymentMode === "FULL" ? "(optional)" : "(required)"}
                  </Label>
                  <Select value={customerId || "none"} onValueChange={(v) => setCustomerId(v === "none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Walk-in customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Walk-in customer</SelectItem>
                      {customers?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Payment</Label>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Payment type">
                    <Button type="button" variant={paymentMode === "FULL" ? "default" : "outline"} onClick={() => setPaymentMode("FULL")}>
                      Full payment
                    </Button>
                    <Button type="button" variant={paymentMode === "DEPOSIT" ? "default" : "outline"} onClick={() => setPaymentMode("DEPOSIT")}>
                      Deposit
                    </Button>
                    <Button type="button" variant={paymentMode === "CREDIT" ? "default" : "outline"} onClick={() => setPaymentMode("CREDIT")}>
                      Credit
                    </Button>
                  </div>
                </div>

                {paymentMode !== "CREDIT" && (
                  <div className="space-y-2">
                    <Label className="text-xs">{paymentMode === "DEPOSIT" ? "Deposit method" : "Payment method"}</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                        <SelectItem value="POS">POS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {paymentMode === "DEPOSIT" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Deposit received ({business.currency})</Label>
                    <Input type="number" min={0.01} max={Math.max(0, total - 0.01)} step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Enter amount received" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Discount ({business.currency})</Label>
                    <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5 text-sm pt-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatMoney(subtotal, business.currency)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>-{formatMoney(discountNum, business.currency)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-1.5 border-t">
                    <span>Total</span>
                    <span>{formatMoney(total, business.currency)}</span>
                  </div>
                  {paymentMode !== "FULL" && (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{paymentMode === "DEPOSIT" ? "Deposit received" : "Paid now"}</span>
                        <span>{formatMoney(paymentMode === "DEPOSIT" ? depositNum : 0, business.currency)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-destructive">
                        <span>Balance due</span>
                        <span>{formatMoney(total - (paymentMode === "DEPOSIT" ? Math.min(depositNum, total) : 0), business.currency)}</span>
                      </div>
                    </>
                  )}
                </div>

                <Button className="w-full h-12 text-base" onClick={completeSale} loading={submitting} disabled={cart.length === 0}>
                  Complete Sale
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
