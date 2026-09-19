import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Returns the authenticated user's id, or throws a 401 ApiError.
 * Every API route that touches business data must call this first.
 */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }
  return userId;
}

/**
 * Resolves the current user's active business.
 *
 * SECURITY: this is the ONLY sanctioned way to determine which business
 * an authenticated request may act on. The businessId is derived from the
 * BusinessUser membership row for this user, never trusted from client
 * input (query params, body, headers). This guarantees a user from
 * Business A can never read or write Business B's data.
 */
export async function requireBusiness(userId: string) {
  const membership = await prisma.businessUser.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });

  if (!membership) {
    throw new ApiError(404, "No business found for this user. Complete onboarding first.");
  }

  return { business: membership.business, role: membership.role };
}

/**
 * Verifies that a given resource's businessId matches the caller's own
 * business. Use this whenever a resource id comes from the client (e.g. a
 * product id in the URL) to ensure it truly belongs to the caller's
 * business before reading/mutating it.
 */
export function assertOwnership(resourceBusinessId: string, callerBusinessId: string) {
  if (resourceBusinessId !== callerBusinessId) {
    throw new ApiError(403, "Forbidden");
  }
}
