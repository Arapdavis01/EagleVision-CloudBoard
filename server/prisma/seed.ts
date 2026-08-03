import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'your-email@gmail.com';   // <-- replace with your real email
  const password = 'your-secure-password'; // <-- replace

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log('User already exists, skipping seed.');
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, password: hash },
  });
  console.log(`User ${email} created successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
