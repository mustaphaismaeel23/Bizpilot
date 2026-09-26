"use client";

import { createContext, useContext } from "react";
import type { BusinessRole } from "@prisma/client";

export interface BusinessInfo {
  id: string;
  name: string;
  role: BusinessRole;
  category?: string | null;
  phone?: string | null;
  address?: string | null;
  logo?: string | null;
  currency: string;
}

export const BusinessContext = createContext<BusinessInfo | null>(null);

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessContext.Provider");
  return ctx;
}
