"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { Topbar } from "@/components/shared/topbar";
import { BusinessContext, BusinessInfo } from "@/components/shared/business-context";
import { apiRequest } from "@/hooks/use-fetch";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    apiRequest<BusinessInfo | null>("/api/business")
      .then((b) => {
        if (!b) {
          router.push("/onboarding");
          return;
        }
        setBusiness(b);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <BusinessContext.Provider value={business}>
      <div className="min-h-screen bg-secondary/20">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="lg:pl-64">
          <Topbar onMenuClick={() => setMobileOpen(true)} />
          <main className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</main>
        </div>
      </div>
    </BusinessContext.Provider>
  );
}
