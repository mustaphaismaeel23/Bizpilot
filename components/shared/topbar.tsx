"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Menu, Search, Bell, ChevronDown, LogOut, Settings, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/components/shared/business-context";
import { useFetch, apiRequest } from "@/hooks/use-fetch";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const business = useBusiness();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const { data, refetch } = useFetch<{ notifications: Notification[]; unreadCount: number }>(
    "/api/notifications"
  );

  const markAllRead = async () => {
    await apiRequest("/api/notifications", { method: "PATCH", body: {} });
    refetch();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden text-muted-foreground">
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden sm:block max-w-xs w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search..." className="pl-9" disabled />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="hidden sm:flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-[140px] truncate">{business.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Your business</DropdownMenuLabel>
            <DropdownMenuItem disabled>{business.name}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Multi-business support coming soon
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger className="relative rounded-md p-2 hover:bg-secondary">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {(data?.unreadCount ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {data!.unreadCount > 9 ? "9+" : data!.unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              {(data?.unreadCount ?? 0) > 0 && business.role !== "STAFF" && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {!data || data.notifications.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
              ) : (
                data.notifications.map((n) => (
                  <div key={n.id} className={`px-3 py-2.5 text-sm ${!n.read ? "bg-accent/40" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.read && <Badge className="shrink-0">New</Badge>}
                    </div>
                    <p className="text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{session?.user?.name}</DropdownMenuLabel>
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {session?.user?.email}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Role: {business.role === "OWNER" ? "Admin" : business.role.charAt(0) + business.role.slice(1).toLowerCase()}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
