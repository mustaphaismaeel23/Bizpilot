"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Pencil, Trash2, Users, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
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
import { customerSchema, CustomerInput } from "@/lib/validators";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  totalPurchases: number;
  outstandingDebt: number;
}

export default function CustomersPage() {
  const business = useBusiness();
  const canManageCustomers = business.role !== "STAFF";
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const query = search ? `?q=${encodeURIComponent(search)}` : "";
  const { data, loading, refetch } = useFetch<Customer[]>(`/api/customers${query}`, [search]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({ resolver: zodResolver(customerSchema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", phone: "", email: "", address: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    reset({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "" });
    setDialogOpen(true);
  };

  const onSubmit = async (values: CustomerInput) => {
    try {
      if (editing) {
        await apiRequest(`/api/customers/${editing.id}`, { method: "PATCH", body: values });
        toast({ title: "Customer updated", variant: "success" });
      } else {
        await apiRequest("/api/customers", { method: "POST", body: values });
        toast({ title: "Customer added", variant: "success" });
      }
      setDialogOpen(false);
      refetch();
    } catch (e) {
      toast({ title: "Failed to save customer", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const handleDelete = async (c: Customer) => {
    const yes = await confirm({ title: `Delete ${c.name}?`, destructive: true });
    if (!yes) return;
    try {
      await apiRequest(`/api/customers/${c.id}`, { method: "DELETE" });
      toast({ title: "Customer deleted", variant: "success" });
      refetch();
    } catch (e) {
      toast({ title: "Failed to delete", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customers and track their purchase history and credit."
        actions={
          canManageCustomers ? <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Customer
          </Button> : undefined
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search customers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <EmptyState icon={Users} title="No customers yet" actionLabel="Add Customer" onAction={openCreate} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Purchases</TableHead>
                  <TableHead>Outstanding Debt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{formatMoney(c.totalPurchases, business.currency)}</TableCell>
                    <TableCell className={c.outstandingDebt > 0 ? "text-destructive font-medium" : ""}>
                      {formatMoney(c.outstandingDebt, business.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/customers/${c.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {canManageCustomers && <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c)}>
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
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input {...register("address")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? "Save changes" : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}
