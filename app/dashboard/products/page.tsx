"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Pencil, Trash2, Package, Tags, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useBusiness } from "@/components/shared/business-context";
import { useFetch, apiRequest } from "@/hooks/use-fetch";
import { useToast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/utils";
import { productSchema, ProductInput } from "@/lib/validators";

interface Category {
  id: string;
  name: string;
}
interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  category: Category | null;
  buyingPrice: string;
  sellingPrice: string;
  wholesalePrice: string | null;
  quantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

function statusFor(p: Product) {
  if (p.quantity <= 0) return "OUT OF STOCK";
  if (p.quantity <= p.lowStockThreshold) return "LOW STOCK";
  return "IN STOCK";
}

export default function ProductsPage() {
  const business = useBusiness();
  const canManageProducts = business.role === "OWNER" || business.role === "MANAGER";
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (categoryFilter !== "all") query.set("categoryId", categoryFilter);

  const { data, loading, refetch } = useFetch<{ items: Product[]; total: number }>(
    `/api/products?${query.toString()}`,
    [search, categoryFilter]
  );
  const { data: categories, refetch: refetchCategories } = useFetch<
    (Category & { _count: { products: number } })[]
  >("/api/categories");

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    try {
      await apiRequest("/api/categories", { method: "POST", body: { name: newCategoryName.trim() } });
      setNewCategoryName("");
      refetchCategories();
      toast({ title: "Category added", variant: "success" });
    } catch (e) {
      toast({ title: "Failed to add category", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await apiRequest(`/api/categories/${id}`, { method: "DELETE" });
      refetchCategories();
      toast({ title: "Category deleted", variant: "success" });
    } catch (e) {
      toast({ title: "Cannot delete category", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({ resolver: zodResolver(productSchema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", sku: "", categoryId: null, buyingPrice: 0, sellingPrice: 0, wholesalePrice: null, quantity: 0, lowStockThreshold: 5, description: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    reset({
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId,
      buyingPrice: parseFloat(p.buyingPrice),
      sellingPrice: parseFloat(p.sellingPrice),
      wholesalePrice: p.wholesalePrice === null ? null : parseFloat(p.wholesalePrice),
      quantity: p.quantity,
      lowStockThreshold: p.lowStockThreshold,
      description: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: ProductInput) => {
    try {
      if (editing) {
        await apiRequest(`/api/products/${editing.id}`, { method: "PATCH", body: values });
        toast({ title: "Product updated", variant: "success" });
      } else {
        await apiRequest("/api/products", { method: "POST", body: values });
        toast({ title: "Product added", variant: "success" });
      }
      setDialogOpen(false);
      refetch();
    } catch (e) {
      toast({ title: "Failed to save product", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const handleDelete = async (p: Product) => {
    const yes = await confirm({
      title: `Deactivate ${p.name}?`,
      description: "This product will be hidden from sales but its history is preserved.",
      destructive: true,
    });
    if (!yes) return;
    await apiRequest(`/api/products/${p.id}`, { method: "DELETE" });
    toast({ title: "Product deactivated", variant: "success" });
    refetch();
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog, pricing and stock levels."
        actions={
          canManageProducts ? <>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
              <Tags className="h-4 w-4" /> Categories
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </> : undefined
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product to start tracking inventory and sales."
              actionLabel={canManageProducts ? "Add Product" : undefined}
              onAction={canManageProducts ? openCreate : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Buying Price</TableHead>
                  <TableHead>Retail Price</TableHead>
                  <TableHead>Wholesale Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell>{p.category?.name ?? "—"}</TableCell>
                    <TableCell>{formatMoney(p.buyingPrice, business.currency)}</TableCell>
                    <TableCell>{formatMoney(p.sellingPrice, business.currency)}</TableCell>
                    <TableCell>{p.wholesalePrice === null ? "Not set" : formatMoney(p.wholesalePrice, business.currency)}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>
                      <StatusBadge status={statusFor(p)} />
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageProducts && <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Product name</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU (optional)</Label>
                <Input {...register("sku")} placeholder="Auto-generated" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="No category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categories?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buying price ({business.currency})</Label>
                <Input type="number" step="0.01" {...register("buyingPrice")} />
                {errors.buyingPrice && <p className="text-sm text-destructive">{errors.buyingPrice.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Retail price ({business.currency})</Label>
                <Input type="number" step="0.01" {...register("sellingPrice")} />
                {errors.sellingPrice && <p className="text-sm text-destructive">{errors.sellingPrice.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Wholesale price ({business.currency}, optional)</Label>
                <Input type="number" step="0.01" min={0} {...register("wholesalePrice")} />
                {errors.wholesalePrice && <p className="text-sm text-destructive">{errors.wholesalePrice.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity in stock</Label>
                <Input type="number" {...register("quantity")} disabled={!!editing} />
                {editing && <p className="text-xs text-muted-foreground">Adjust stock from the Inventory page.</p>}
              </div>
              <div className="space-y-2">
                <Label>Low stock threshold</Label>
                <Input type="number" {...register("lowStockThreshold")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea {...register("description")} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? "Save changes" : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
            <Button onClick={handleAddCategory} loading={savingCategory}>
              Add
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
            {categories?.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No categories yet</p>
            )}
            {categories?.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c._count.products} product(s)</p>
                </div>
                <button onClick={() => handleDeleteCategory(c.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
}
