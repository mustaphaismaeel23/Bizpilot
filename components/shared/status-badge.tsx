import { Badge } from "@/components/ui/badge";

const map: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  PAID: { label: "Paid", variant: "success" },
  PARTIAL: { label: "Partial", variant: "warning" },
  UNPAID: { label: "Unpaid", variant: "destructive" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  REFUNDED: { label: "Refunded", variant: "secondary" },
  "IN STOCK": { label: "In Stock", variant: "success" },
  "LOW STOCK": { label: "Low Stock", variant: "warning" },
  "OUT OF STOCK": { label: "Out of Stock", variant: "destructive" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
