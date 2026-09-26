"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Receipt,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/components/shared/business-context";
import { hasBusinessPermission, type BusinessPermission } from "@/lib/permissions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { href: "/dashboard/sales", label: "Sales", icon: ShoppingCart, permission: "sales:view" },
  { href: "/dashboard/products", label: "Products", icon: Package, permission: "products:view" },
  { href: "/dashboard/inventory", label: "Inventory", icon: Boxes, permission: "inventory:view" },
  { href: "/dashboard/customers", label: "Customers", icon: Users, permission: "customers:view" },
  { href: "/dashboard/expenses", label: "Expenses", icon: Receipt, permission: "expenses:view" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, permission: "reports:view" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const business = useBusiness();
  const visibleNav = NAV.filter((item) =>
    !item.permission || hasBusinessPermission(business.role, item.permission as BusinessPermission)
  );

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <button onClick={onClose} className="lg:hidden text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visibleNav.map((item) => {
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-muted-foreground border-t">
        <p>BizPilot MVP</p>
        <p>Run your business. Know your numbers.</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-background">
        {content}
      </aside>

      {/* Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-background shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
