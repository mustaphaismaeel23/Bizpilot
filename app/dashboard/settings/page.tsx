"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/components/shared/business-context";
import { useFetch, apiRequest } from "@/hooks/use-fetch";
import { useToast } from "@/components/ui/toaster";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

function BusinessProfileTab() {
  const business = useBusiness();
  const { toast } = useToast();
  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: business.name,
      category: business.category ?? "",
      phone: business.phone ?? "",
      address: business.address ?? "",
      currency: business.currency,
    },
  });

  const onSubmit = async (values: any) => {
    try {
      await apiRequest("/api/business", { method: "PATCH", body: values });
      toast({ title: "Business profile updated", variant: "success" });
    } catch (e) {
      toast({ title: "Failed to update", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Profile</CardTitle>
        <CardDescription>Update your business details shown on receipts and reports.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input {...register("name")} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input {...register("category")} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <Button type="submit" loading={isSubmitting}>
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function UserProfileTab() {
  const { toast } = useToast();
  const { data } = useFetch<{ name: string; email: string; phone: string | null }>("/api/account");
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: { name: "", phone: "" } });

  useEffect(() => {
    if (data) reset({ name: data.name, phone: data.phone ?? "" });
  }, [data, reset]);

  const onSubmit = async (values: any) => {
    try {
      await apiRequest("/api/account", { method: "PATCH", body: values });
      toast({ title: "Profile updated", variant: "success" });
    } catch (e) {
      toast({ title: "Failed to update", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Your personal account details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input {...register("name")} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={data?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...register("phone")} />
          </div>
          <Button type="submit" loading={isSubmitting}>
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const onSubmit = async (values: any) => {
    try {
      await apiRequest("/api/account", { method: "PATCH", body: values });
      toast({ title: "Password updated", variant: "success" });
      reset();
    } catch (e) {
      toast({ title: "Failed to update password", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Current password</Label>
            <Input type="password" {...register("currentPassword", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" {...register("newPassword", { required: true, minLength: 8 })} />
          </div>
          <Button type="submit" loading={isSubmitting}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({ lowStock: true, sales: true, credit: true });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose which in-app notifications you receive.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Low stock alerts</p>
            <p className="text-xs text-muted-foreground">Get notified when products run low.</p>
          </div>
          <Switch checked={prefs.lowStock} onCheckedChange={(v) => setPrefs((p) => ({ ...p, lowStock: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sale confirmations</p>
            <p className="text-xs text-muted-foreground">Get notified on every completed sale.</p>
          </div>
          <Switch checked={prefs.sales} onCheckedChange={(v) => setPrefs((p) => ({ ...p, sales: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Customer credit alerts</p>
            <p className="text-xs text-muted-foreground">Get notified when credit is recorded.</p>
          </div>
          <Switch checked={prefs.credit} onCheckedChange={(v) => setPrefs((p) => ({ ...p, credit: v }))} />
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionTab() {
  const plans = [
    { name: "Free", price: "₦0", period: "/month", features: ["1 business", "Up to 50 products", "Basic reports"] },
    { name: "Basic", price: "₦2,500", period: "/month", features: ["1 business", "Unlimited products", "All reports", "CSV export"] },
    { name: "Pro", price: "₦5,000", period: "/month", features: ["Everything in Basic", "Staff accounts (soon)", "Priority support"], highlight: true },
    { name: "Business", price: "₦10,000", period: "/month", features: ["Everything in Pro", "Multiple branches (soon)", "WhatsApp receipts (soon)"] },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>You&apos;re currently on the Free plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-lg border p-4 ${p.highlight ? "border-primary ring-1 ring-primary" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{p.name}</p>
                {p.highlight && <Badge>Popular</Badge>}
              </div>
              <p className="mt-2">
                <span className="text-2xl font-bold">{p.price}</span>
                <span className="text-muted-foreground text-sm">{p.period}</span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {p.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <Button
                variant={p.name === "Free" ? "outline" : "default"}
                className="w-full mt-4"
                disabled={p.name === "Free"}
              >
                {p.name === "Free" ? "Current Plan" : "Coming Soon"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Manage your business and account preferences." />
      <Tabs defaultValue="business">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="business">Business Profile</TabsTrigger>
          <TabsTrigger value="user">User Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
        <TabsContent value="business">
          <BusinessProfileTab />
        </TabsContent>
        <TabsContent value="user">
          <UserProfileTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
