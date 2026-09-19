import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().min(7, "Enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const businessOnboardingSchema = z.object({
  name: z.string().min(2, "Business name is required"),
  category: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().default("NGN"),
  logo: z.string().optional(),
});
export type BusinessOnboardingInput = z.infer<typeof businessOnboardingSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  categoryId: z.string().optional().nullable(),
  sku: z.string().optional(),
  description: z.string().optional(),
  buyingPrice: z.coerce.number().min(0, "Buying price must be 0 or more"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be 0 or more"),
  quantity: z.coerce.number().int().min(0, "Quantity must be 0 or more"),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type ProductInput = z.infer<typeof productSchema>;

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
});

export const createSaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "Add at least one product"),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "TRANSFER", "POS", "CREDIT"]),
  amountPaid: z.coerce.number().min(0).optional(),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const debtPaymentSchema = z.object({
  saleId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  note: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.enum([
    "RENT",
    "ELECTRICITY",
    "INTERNET",
    "TRANSPORT",
    "SALARY",
    "FUEL",
    "MAINTENANCE",
    "OTHER",
  ]),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.coerce.date().optional(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["PURCHASE", "ADJUSTMENT", "RETURN"]),
  quantity: z.coerce.number().int(),
  reference: z.string().optional(),
});
