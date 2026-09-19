import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Free",
    price: "₦0",
    features: ["1 business", "Up to 50 products", "Basic dashboard", "Sales & inventory tracking"],
  },
  {
    name: "Basic",
    price: "₦2,500",
    features: ["1 business", "Unlimited products", "Customer credit tracking", "All reports"],
  },
  {
    name: "Pro",
    price: "₦5,000",
    highlight: true,
    features: ["Everything in Basic", "CSV export", "Priority support", "Staff accounts (coming soon)"],
  },
  {
    name: "Business",
    price: "₦10,000",
    features: ["Everything in Pro", "Multiple branches (coming soon)", "WhatsApp receipts (coming soon)"],
  },
];

export function PricingSection() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {PLANS.map((plan) => (
        <div
          key={plan.name}
          className={`rounded-xl border p-6 flex flex-col ${plan.highlight ? "border-primary ring-1 ring-primary" : ""}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{plan.name}</h3>
            {plan.highlight && <Badge>Popular</Badge>}
          </div>
          <p className="mt-3">
            <span className="text-3xl font-bold">{plan.price}</span>
            <span className="text-muted-foreground text-sm">/month</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground flex-1">
            {plan.features.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <Button className="mt-6 w-full" variant={plan.highlight ? "default" : "outline"} asChild>
            <Link href="/register">{plan.name === "Free" ? "Start Free" : "Get Started"}</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
