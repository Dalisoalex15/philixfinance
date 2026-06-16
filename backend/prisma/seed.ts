import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Philix Finance database...");

  const passwordHash = await bcrypt.hash("philix@CEO2025", 12);

  const ceo = await prisma.user.upsert({
    where: { email: "daliso@philixfinance.com" },
    update: { passwordHash },
    create: {
      employeeId: "PHX-001",
      email: "daliso@philixfinance.com",
      passwordHash,
      firstName: "Daliso",
      lastName: "Phiri",
      phone: "+260 977 100001",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("CEO created: " + ceo.email);
  console.log("Seed complete! CEO login: daliso@philixfinance.com / philix@CEO2025");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
