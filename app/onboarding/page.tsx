"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { businessOnboardingSchema, BusinessOnboardingInput } from "@/lib/validators";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Logo } from "@/components/shared/logo";
import { useToast } from "@/components/ui/toaster";
import { apiRequest } from "@/hooks/use-fetch";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];
const CATEGORIES = [
  "Retail / Electronics",
  "Fashion & Apparel",
  "Food & Beverage",
  "Groceries / Supermarket",
  "Pharmacy",
  "Services",
  "Other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BusinessOnboardingInput>({
    resolver: zodResolver(businessOnboardingSchema),
    defaultValues: { currency: "NGN" },
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    apiRequest("/api/business")
      .then((business) => {
        if (business) router.push("/dashboard");
      })
      .finally(() => setChecking(false));
  }, [router]);

  const onSubmit = async (data: BusinessOnboardingInput) => {
    setLoading(true);
    try {
      await apiRequest("/api/business", { method: "POST", body: data });
      toast({ title: "Business created", description: "Welcome to BizPilot!", variant: "success" });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast({
        title: "Setup failed",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8" />
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Set up your business</CardTitle>
          <CardDescription>Tell us a bit about your business to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business name</Label>
              <Input id="name" placeholder="e.g. Northside Market" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business category</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Business phone</Label>
              <Input id="phone" placeholder="080XXXXXXXX" {...register("phone")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business address</Label>
              <Input id="address" placeholder="Street, city" {...register("address")} />
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Continue to dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
