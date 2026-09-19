import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validators";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Prisma.ExpenseWhereInput = { businessId: business.id };
    if (category) where.category = category as Prisma.EnumExpenseCategoryFilter["equals"];
    if (q) where.description = { contains: q, mode: "insensitive" };
    if (from || to) {
      where.date = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { date: "desc" },
    });

    return ok(expenses);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);
    const body = await req.json();
    const data = expenseSchema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        businessId: business.id,
        userId,
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: data.date ?? new Date(),
      },
    });

    await prisma.auditLog.create({
      data: { businessId: business.id, userId, action: "CREATED", entity: "Expense", entityId: expense.id },
    });

    return ok(expense, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
