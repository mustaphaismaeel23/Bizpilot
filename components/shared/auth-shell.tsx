import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/">
            <Logo className="mb-8" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
      <div className="hidden lg:flex flex-col justify-center bg-primary px-16 text-primary-foreground">
        <p className="text-3xl font-bold leading-tight">Run your business.<br />Know your numbers.</p>
        <p className="mt-4 text-primary-foreground/80 max-w-md">
          Track sales, inventory, customers, expenses and profit in one simple platform built for
          small and medium-sized businesses.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-primary-foreground/90">
          <li>✓ Real-time sales & inventory tracking</li>
          <li>✓ Automatic profit calculation</li>
          <li>✓ Customer credit management</li>
          <li>✓ Printable receipts & reports</li>
        </ul>
      </div>
    </div>
  );
}
