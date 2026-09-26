import type { BusinessRole } from "@prisma/client";

export type BusinessPermission =
  | "dashboard:view"
  | "sales:view"
  | "sales:manage"
  | "products:view"
  | "products:manage"
  | "inventory:view"
  | "inventory:manage"
  | "customers:view"
  | "customers:manage"
  | "expenses:view"
  | "expenses:manage"
  | "reports:view"
  | "business:view"
  | "business:manage"
  | "notifications:view"
  | "notifications:manage"
  | "team:manage";

const ALL_PERMISSIONS: BusinessPermission[] = [
  "dashboard:view",
  "sales:view",
  "sales:manage",
  "products:view",
  "products:manage",
  "inventory:view",
  "inventory:manage",
  "customers:view",
  "customers:manage",
  "expenses:view",
  "expenses:manage",
  "reports:view",
  "business:view",
  "business:manage",
  "notifications:view",
  "notifications:manage",
  "team:manage",
];

const ROLE_PERMISSIONS: Record<BusinessRole, BusinessPermission[]> = {
  OWNER: ALL_PERMISSIONS,
  MANAGER: [
    "dashboard:view",
    "sales:view",
    "sales:manage",
    "products:view",
    "products:manage",
    "inventory:view",
    "inventory:manage",
    "customers:view",
    "customers:manage",
    "expenses:view",
    "expenses:manage",
    "reports:view",
    "business:view",
    "notifications:view",
    "notifications:manage",
  ],
  CASHIER: [
    "dashboard:view",
    "sales:view",
    "sales:manage",
    "products:view",
    "inventory:view",
    "customers:view",
    "customers:manage",
    "notifications:view",
    "notifications:manage",
  ],
  STAFF: [
    "dashboard:view",
    "sales:view",
    "products:view",
    "inventory:view",
    "customers:view",
    "notifications:view",
  ],
};

export function hasBusinessPermission(role: BusinessRole, permission: BusinessPermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}
