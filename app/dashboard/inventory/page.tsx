"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Boxes, PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useFetch, apiRequest } from "@/hooks/use-fetch";
import { useToast } from "@/components/ui/toaster";
import { useBusiness } from "@/components/shared/business-context";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  lowStockThreshold: number;
}
interface Txn {
  id: string;
  type: string;
  quantity: number;
  reference: string | null;
  createdAt: string;
  product: { name: string };
  user: { name: string };
}

function statusFor(p: Product) {
  if (p.quantity <= 0) return "OUT OF STOCK";
  if (p.quantity <= p.lowStockThreshold) return "LOW STOCK";
  return "IN STOCK";
}

export default function InventoryPage() {
  const business = useBusiness();
  const canManageInventory = business.role === "OWNER" || business.role === "MANAGER";
  const { toast } = useToast();
  const { data: products, loading, refetch } = useFetch<{ items: Product[] }>("/api/products?pageSize=100");
  const { data: txns, loading: txnLoading, refetch: refetchTxns } = useFetch<Txn[]>("/api/inventory");
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useForm<{ productId: string; type: "PURCHASE" | "ADJUSTMENT" | "RETURN"; quantity: number; reference?: string }>({
    defaultValues: { type: "PURCHASE" },
  });

  const openDialog = () => {
    reset({ type: "PURCHASE", quantity: 1, reference: "" });
    setDialogOpen(true);
  };

  const onSubmit = async (values: any) => {
    try {
      await apiRequest("/api/inventory", {
        method: "POST",
        body: { ...values, quantity: values.type === "ADJUSTMENT" ? Number(values.quantity) : Math.abs(Number(values.quantity)) },
      });
      toast({ title: "Stock updated", variant: "success" });
      setDialogOpen(false);
      refetch();
      refetchTxns();
    } catch (e) {
      toast({ title: "Failed to update stock", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track stock levels and movements across your products."
        actions={
          canManageInventory ? <Button onClick={openDialog}>
            <PackagePlus className="h-4 w-4" /> Stock In / Adjust
          </Button> : undefined
        }
      />

      <Tabs defaultValue="levels">
        <TabsList>
          <TabsTrigger value="levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="history">Stock History</TabsTrigger>
        </TabsList>

        <TabsContent value="levels">
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : !products || products.items.length === 0 ? (
                <EmptyState icon={Boxes} title="No products yet" description="Add products first to track their inventory." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Low Stock Threshold</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.items.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell>{p.quantity}</TableCell>
                        <TableCell>{p.lowStockThreshold}</TableCell>
                        <TableCell>
                          <StatusBadge status={statusFor(p)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
              {txnLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : !txns || txns.length === 0 ? (
                <EmptyState icon={Boxes} title="No stock movements yet" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txns.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{format(new Date(t.createdAt), "dd MMM yyyy, HH:mm")}</TableCell>
                        <TableCell>{t.product.name}</TableCell>
                        <TableCell>{t.type}</TableCell>
                        <TableCell className={t.quantity < 0 ? "text-destructive" : "text-success"}>
                          {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                        </TableCell>
                        <TableCell>{t.reference ?? "—"}</TableCell>
                        <TableCell>{t.user.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock In / Adjustment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Controller
                control={control}
                name="productId"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.items.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.quantity} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PURCHASE">Stock In (Purchase)</SelectItem>
                        <SelectItem value="RETURN">Return</SelectItem>
                        <SelectItem value="ADJUSTMENT">Manual Adjustment (+/-)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" {...register("quantity", { required: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input {...register("reference")} placeholder="e.g. Supplier invoice #" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
