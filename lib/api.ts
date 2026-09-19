import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/lib/session";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

/**
 * Wraps an API route handler with consistent error handling so raw
 * database errors / stack traces never leak to the client.
 */
export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.message, error.status);
  }
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, error.flatten());
  }
  // Prisma known request errors carry a `code` field (e.g. P2002 unique constraint)
  const err = error as { code?: string; message?: string };
  if (err?.code === "P2002") {
    return fail("A record with these details already exists", 409);
  }
  if (err?.code === "P2025") {
    return fail("Record not found", 404);
  }
  console.error("[API_ERROR]", error);
  return fail("Something went wrong. Please try again.", 500);
}
