"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Pencil, Trash2, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useBusiness } from "@/components/shared/business-context";
import { useFetch, apiRequest } from "@/hooks/use-fetch";
import { useToast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/utils";
import { expenseSchema, ExpenseInput } from "@/lib/validators";
import { format } from "date-fns";

const CATEGORIES = ["RENT", "ELECTRICITY", "INTERNET", "TRANSPORT", "SALARY", "FUEL", "MAINTENANCE", "OTHER"];

interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: string;
  date: string;
  user: { name: string };
}

export default function ExpensesPage() {
  const business = useBusiness();
  const canManageExpenses = business.role === "OWNER" || business.role === "MANAGER";
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (category !== "all") query.set("category", category);

  const { data, loading, refetch } = useFetch<Expense[]>(`/api/expenses?${query.toString()}`, [search, category]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseInput>({ resolver: zodResolver(expenseSchema) });

  const openCreate = () => {
    setEditing(null);
    reset({ category: "OTHER", description: "", amount: 0 });
    setDialogOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    reset({ category: e.category as ExpenseInput["category"], description: e.description ?? "", amount: parseFloat(e.amount) });
    setDialogOpen(true);
  };

  const onSubmit = async (values: ExpenseInput) => {
    try {
      if (editing) {
        await apiRequest(`/api/expenses/${editing.id}`, { method: "PATCH", body: values });
        toast({ title: "Expense updated", variant: "success" });
      } else {
        await apiRequest("/api/expenses", { method: "POST", body: values });
        toast({ title: "Expense recorded", variant: "success" });
      }
      setDialogOpen(false);
      refetch();
    } catch (e) {
      toast({ title: "Failed to save expense", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const handleDelete = async (e: Expense) => {
    const yes = await confirm({ title: "Delete this expense?", destructive: true });
    if (!yes) return;
    await apiRequest(`/api/expenses/${e.id}`, { method: "DELETE" });
    toast({ title: "Expense deleted", variant: "success" });
    refetch();
  };

  const total = data?.reduce((sum, e) => sum + parseFloat(e.amount), 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track business expenses by category."
        actions={
          canManageExpenses ? <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button> : undefined
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search description..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!loading && data && data.length > 0 && (
            <div className="mb-4 text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatMoney(total, business.currency)}</span> across {data.length} expense(s)
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses recorded" actionLabel={canManageExpenses ? "Add Expense" : undefined} onAction={canManageExpenses ? openCreate : undefined} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{format(new Date(e.date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{e.category}</Badge>
                    </TableCell>
                    <TableCell>{e.description || "—"}</TableCell>
                    <TableCell>{formatMoney(e.amount, business.currency)}</TableCell>
                    <TableCell>{e.user.name}</TableCell>
                    <TableCell className="text-right">
                      {canManageExpenses && <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e)}>
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
            <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.charAt(0) + c.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount ({business.currency})</Label>
              <Input type="number" step="0.01" {...register("amount")} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input {...register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? "Save changes" : "Add Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}
