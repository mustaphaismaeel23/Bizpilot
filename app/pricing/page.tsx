import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { PricingSection } from "@/components/shared/pricing-section";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/">
            <Logo />
          </Link>
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

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-center">Simple, transparent pricing</h1>
        <p className="text-muted-foreground text-center mt-2">
          Start free. Upgrade as your business grows. No hidden fees.
        </p>
        <div className="mt-12">
          <PricingSection />
        </div>
      </section>
    </div>
  );
}
