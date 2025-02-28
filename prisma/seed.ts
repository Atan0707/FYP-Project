import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Sample users
  const users = [
    {
      email: 'atan@gmail.com',
      password: 'atan1234',
      fullName: 'Atan',
      ic: '01',
      phone: '0123456789',
    },
    {
      email: 'jamal@gmail.com',
      password: 'jamal1234',
      fullName: 'Jamal',
      ic: '02',
      phone: '0123456789',
    },
    {
      email: 'zain@gmail.com',
      password: 'zain1234',
      fullName: 'Zain',
      ic: '03',
    },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.create({
      data: {
        email: user.email,
        password: hashedPassword,
        fullName: user.fullName,
        ic: user.ic || '',
        phone: user.phone || '',
      },
    });
  }

  console.log('Users seeded successfully');

  // Create admin account
  const adminPassword = await bcrypt.hash('root', 10);
  await prisma.admin.create({
    data: {
      username: 'admin',
      password: adminPassword,
    },
  });

  console.log('Admin account seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 