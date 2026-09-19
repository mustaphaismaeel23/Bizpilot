import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Users,
  Receipt,
  BarChart3,
  Boxes,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { PricingSection } from "@/components/shared/pricing-section";

const FEATURES = [
  { icon: ShoppingCart, title: "Sales & POS", desc: "A fast, mobile-friendly point of sale to record every transaction accurately." },
  { icon: Package, title: "Product Catalog", desc: "Organize products into categories with pricing, SKUs and stock tracking." },
  { icon: Boxes, title: "Inventory Control", desc: "Real-time stock levels with low-stock alerts so you never run out." },
  { icon: Users, title: "Customer & Credit", desc: "Track customers, purchase history and outstanding credit balances." },
  { icon: Receipt, title: "Expense Tracking", desc: "Log every business expense by category to see your true net result." },
  { icon: BarChart3, title: "Reports & Insights", desc: "Sales, profit, inventory and customer reports — exportable to CSV." },
];

const STEPS = [
  { title: "Set up your business", desc: "Create your account and business profile in under two minutes." },
  { title: "Add your products", desc: "Organize your catalog with categories, prices and stock levels." },
  { title: "Start selling", desc: "Record sales, track expenses, and watch your numbers update live." },
];

const FAQ = [
  { q: "Do I need technical knowledge to use BizPilot?", a: "No. BizPilot is built for non-technical business owners with a clean, simple interface." },
  { q: "Can I track customer credit/debt?", a: "Yes. Record credit sales and track outstanding balances per customer, with payment history." },
  { q: "What currency does BizPilot support?", a: "BizPilot defaults to NGN but supports other currencies from your business settings." },
  { q: "Can I export my reports?", a: "Yes. Sales, profit, expense, inventory and customer reports can be exported to CSV." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how-it-works" className="hover:text-foreground">How it works</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Start Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-4 py-20">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Know exactly how your business is performing.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          Track sales, inventory, expenses and profit in one simple platform.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/register">
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#how-it-works">See How It Works</a>
          </Button>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="bg-secondary/30 py-16">
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-xl font-bold mb-2">The problem</h2>
            <p className="text-muted-foreground">
              Most small business owners run sales, stock and expenses across notebooks, spreadsheets
              and memory — making it hard to know real profit, catch low stock in time, or track who
              owes what.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">The BizPilot solution</h2>
            <p className="text-muted-foreground">
              One simple dashboard that records every sale, updates stock automatically, tracks
              expenses and customer credit, and shows you real revenue and gross profit — every day.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center">Everything you need to run your business</h2>
        <p className="text-muted-foreground text-center mt-2 max-w-xl mx-auto">
          Built for small and medium-sized businesses that want clarity without complexity.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-secondary/30 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8 mt-12">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center">Simple, transparent pricing</h2>
        <p className="text-muted-foreground text-center mt-2">Start free. Upgrade as your business grows.</p>
        <div className="mt-12">
          <PricingSection />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-secondary/30 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-6">
            {FAQ.map((f) => (
              <div key={f.q} className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{f.q}</p>
                  <p className="text-sm text-muted-foreground mt-1">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto text-center px-4 py-20">
        <h2 className="text-3xl font-bold">Ready to know your numbers?</h2>
        <p className="text-muted-foreground mt-2">Create your free BizPilot account in minutes.</p>
        <Button size="lg" className="mt-6" asChild>
          <Link href="/register">
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo />
          <p>© {new Date().getFullYear()} BizPilot. Run your business. Know your numbers.</p>
        </div>
      </footer>
    </div>
  );
}
