import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness } from "@/lib/session";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);

    const notifications = await prisma.notification.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const unreadCount = await prisma.notification.count({
      where: { businessId: business.id, read: false },
    });

    return ok({ notifications, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { business } = await requireBusiness(userId);
    const body = await req.json().catch(() => ({}));

    if (body.id) {
      await prisma.notification.updateMany({
        where: { id: body.id, businessId: business.id },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { businessId: business.id, read: false },
        data: { read: true },
      });
    }

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
