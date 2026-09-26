import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("The development seed can only run when NODE_ENV=development.");
  }

  const email = process.env.DEV_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.DEV_SEED_PASSWORD;
  const name = process.env.DEV_SEED_NAME?.trim() || "Local Developer";
  const businessName = process.env.DEV_SEED_BUSINESS?.trim() || "Local Development Business";

  if (!email || !password) {
    throw new Error("Set DEV_SEED_EMAIL and DEV_SEED_PASSWORD before running the development seed.");
  }
  if (password.length < 12) {
    throw new Error("DEV_SEED_PASSWORD must be at least 12 characters long.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash },
  });

  let business = await prisma.business.findFirst({ where: { ownerId: user.id } });
  if (!business) {
    business = await prisma.business.create({
      data: {
        ownerId: user.id,
        name: businessName,
        businessUsers: { create: { userId: user.id, role: "OWNER" } },
      },
    });
  }

  console.log(`Development account ready for ${email} (${business.name}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
