import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@bizpilot.app" },
    update: {},
    create: {
      name: "Demo Owner",
      email: "demo@bizpilot.app",
      phone: "+2348012345678",
      passwordHash,
    },
  });

  let business = await prisma.business.findFirst({ where: { ownerId: user.id } });
  if (!business) {
    business = await prisma.business.create({
      data: {
        ownerId: user.id,
        name: "Demo Electronics Store",
        category: "Electronics & Gadgets",
        phone: "+2348012345678",
        address: "12 Allen Avenue, Ikeja, Lagos",
        currency: "NGN",
      },
    });
    await prisma.businessUser.create({
      data: { businessId: business.id, userId: user.id, role: "OWNER" },
    });
  }

  const categoryNames = ["Chargers & Cables", "Audio", "Power", "Accessories"];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { businessId_name: { businessId: business.id, name } },
      update: {},
      create: { businessId: business.id, name },
    });
    categories[name] = cat.id;
  }

  const productDefs = [
    { name: "iPhone Charger", sku: "IPH-CHG-01", category: "Chargers & Cables", buyingPrice: 3500, sellingPrice: 5500, quantity: 40, lowStockThreshold: 10 },
    { name: "Type-C Cable", sku: "TYC-CBL-01", category: "Chargers & Cables", buyingPrice: 1200, sellingPrice: 2500, quantity: 4, lowStockThreshold: 10 },
    { name: "Power Bank 10000mAh", sku: "PWB-10K-01", category: "Power", buyingPrice: 8000, sellingPrice: 13500, quantity: 1, lowStockThreshold: 5 },
    { name: "Wireless Earbuds", sku: "EAR-BUD-01", category: "Audio", buyingPrice: 9500, sellingPrice: 16000, quantity: 25, lowStockThreshold: 8 },
    { name: "Screen Protector", sku: "SCR-PRT-01", category: "Accessories", buyingPrice: 500, sellingPrice: 1500, quantity: 60, lowStockThreshold: 15 },
  ];

  const products: Record<string, { id: string; buyingPrice: number; sellingPrice: number }> = {};
  for (const p of productDefs) {
    const existing = await prisma.product.findUnique({
      where: { businessId_sku: { businessId: business.id, sku: p.sku } },
    });
    const product =
      existing ??
      (await prisma.product.create({
        data: {
          businessId: business.id,
          categoryId: categories[p.category],
          name: p.name,
          sku: p.sku,
          buyingPrice: p.buyingPrice,
          sellingPrice: p.sellingPrice,
          quantity: p.quantity,
          lowStockThreshold: p.lowStockThreshold,
        },
      }));
    products[p.name] = { id: product.id, buyingPrice: p.buyingPrice, sellingPrice: p.sellingPrice };
  }

  const customerDefs = [
    { name: "Amaka Obi", phone: "08031112222", email: "amaka@example.com" },
    { name: "Tunde Bakare", phone: "08033334444", email: "tunde@example.com" },
    { name: "Chinedu Eze", phone: "08035556666", email: "chinedu@example.com" },
  ];
  const customers: string[] = [];
  for (const c of customerDefs) {
    const existing = await prisma.customer.findFirst({ where: { businessId: business.id, phone: c.phone } });
    const customer =
      existing ??
      (await prisma.customer.create({ data: { businessId: business.id, ...c } }));
    customers.push(customer.id);
  }

  const existingSalesCount = await prisma.sale.count({ where: { businessId: business.id } });
  if (existingSalesCount === 0) {
    const saleDefs = [
      { customerId: customers[0], items: [{ name: "iPhone Charger", qty: 2 }, { name: "Type-C Cable", qty: 1 }], method: "CASH" as const },
      { customerId: customers[1], items: [{ name: "Wireless Earbuds", qty: 1 }], method: "TRANSFER" as const },
      { customerId: null, items: [{ name: "Screen Protector", qty: 3 }], method: "CASH" as const },
      { customerId: customers[2], items: [{ name: "Power Bank 10000mAh", qty: 1 }], method: "CREDIT" as const },
    ];

    for (let i = 0; i < saleDefs.length; i++) {
      const s = saleDefs[i];
      let subtotal = 0;
      let totalCost = 0;
      const itemsData = s.items.map((it) => {
        const p = products[it.name];
        const lineSub = p.sellingPrice * it.qty;
        const lineCost = p.buyingPrice * it.qty;
        subtotal += lineSub;
        totalCost += lineCost;
        return {
          productId: p.id,
          quantity: it.qty,
          unitPrice: p.sellingPrice,
          buyingPrice: p.buyingPrice,
          subtotal: lineSub,
          cost: lineCost,
          profit: lineSub - lineCost,
        };
      });
      const total = subtotal;
      const grossProfit = total - totalCost;
      const amountPaid = s.method === "CREDIT" ? total * 0.4 : total;
      const balance = total - amountPaid;

      await prisma.sale.create({
        data: {
          businessId: business.id,
          customerId: s.customerId,
          userId: user.id,
          invoiceNumber: `INV-DEMO-${1000 + i}`,
          subtotal,
          discount: 0,
          total,
          totalCost,
          grossProfit,
          amountPaid,
          balance,
          paymentMethod: s.method,
          paymentStatus: balance <= 0 ? "PAID" : "PARTIAL",
          status: "COMPLETED",
          createdAt: new Date(Date.now() - (saleDefs.length - i) * 1000 * 60 * 60 * 20),
          items: { createMany: { data: itemsData } },
        },
      });

      for (const it of s.items) {
        const p = products[it.name];
        await prisma.product.update({ where: { id: p.id }, data: { quantity: { decrement: it.qty } } });
        await prisma.inventoryTransaction.create({
          data: {
            businessId: business.id,
            productId: p.id,
            userId: user.id,
            type: "SALE",
            quantity: -it.qty,
            reference: `INV-DEMO-${1000 + i}`,
          },
        });
      }
    }
  }

  const existingExpenseCount = await prisma.expense.count({ where: { businessId: business.id } });
  if (existingExpenseCount === 0) {
    const expenseDefs = [
      { category: "RENT" as const, description: "Shop rent - monthly", amount: 80000 },
      { category: "ELECTRICITY" as const, description: "PHCN bill", amount: 12000 },
      { category: "TRANSPORT" as const, description: "Supplier pickup", amount: 5000 },
      { category: "SALARY" as const, description: "Sales assistant wages", amount: 45000 },
    ];
    for (const e of expenseDefs) {
      await prisma.expense.create({
        data: { businessId: business.id, userId: user.id, ...e, date: new Date() },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Demo login -> email: demo@bizpilot.app | password: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
