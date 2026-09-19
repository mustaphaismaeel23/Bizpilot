"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forgotPasswordSchema } from "@/lib/validators";
import { AuthShell } from "@/components/shared/auth-shell";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/hooks/use-fetch";
import { CheckCircle2 } from "lucide-react";

type FormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await apiRequest<{ resetUrl?: string }>("/api/forgot-password", {
        method: "POST",
        body: data,
      });
      setResetUrl(result.resetUrl ?? null);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Check your email" description="We've generated a password reset link.">
        <div className="rounded-md border bg-accent/50 p-4 text-sm">
          <div className="flex items-center gap-2 text-accent-foreground font-medium mb-2">
            <CheckCircle2 className="h-4 w-4" /> Reset link ready
          </div>
          <p className="text-muted-foreground">
            No email provider is configured for this demo, so here is your reset link directly:
          </p>
          {resetUrl && (
            <Link href={resetUrl} className="mt-3 block break-all text-primary underline">
              {resetUrl}
            </Link>
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email and we'll help you reset it"
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@business.com" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
