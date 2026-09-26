import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateStaffSchema } from "@/lib/validators";
import { ok, handleApiError } from "@/lib/api";
import { requireUserId, requireBusiness, ApiError } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ownerId = await requireUserId();
    const { business } = await requireBusiness(ownerId, "team:manage");
    const member = await prisma.businessUser.findFirst({
      where: { id: params.id, businessId: business.id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!member || member.role === "OWNER") throw new ApiError(404, "Staff member not found");

    const data = updateStaffSchema.parse(await req.json());
    const updated = await prisma.businessUser.update({
      where: { id: member.id },
      data,
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    await prisma.auditLog.create({
      data: {
        businessId: business.id,
        userId: ownerId,
        action: data.isActive === false ? "STAFF_SUSPENDED" : data.isActive === true ? "STAFF_REACTIVATED" : "STAFF_ROLE_UPDATED",
        entity: "BusinessUser",
        entityId: member.id,
        metadata: { email: member.user.email, role: data.role ?? member.role, isActive: data.isActive ?? member.isActive },
      },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}