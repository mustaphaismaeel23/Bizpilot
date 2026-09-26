import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validators";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness } from "@/lib/session";
import { toNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "customers:view");

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    const where: Prisma.CustomerWhereInput = { businessId: business.id };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        sales: {
          where: { status: { not: "CANCELLED" } },
          select: { total: true, balance: true, paymentStatus: true },
        },
      },
    });

    const result = customers.map((c) => {
      const totalPurchases = c.sales.reduce((sum, s) => sum + toNumber(s.total), 0);
      const outstandingDebt = c.sales.reduce((sum, s) => sum + toNumber(s.balance), 0);
      const { sales, ...rest } = c;
      return { ...rest, totalPurchases, outstandingDebt, salesCount: sales.length };
    });

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId, "customers:manage");
    const body = await req.json();
    const data = customerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        name: data.name.trim(),
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
      },
    });

    await prisma.auditLog.create({
      data: { businessId: business.id, userId, action: "CREATED", entity: "Customer", entityId: customer.id },
    });

    return ok(customer, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
