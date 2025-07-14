import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { encrypt } from '@/services/encryption';

const prisma = new PrismaClient();

async function main() {
  // Sample users
  const users = [
    {
      email: 'atan@gmail.com',
      password: 'atan1234',
      fullName: 'Atan',
      ic: '010101010101',
      phone: '0123456789',
    },
    {
      email: 'jamal@gmail.com',
      password: 'jamal1234',
      fullName: 'Jamal',
      ic: '020202020202',
      phone: '0123456789',
    },
    {
      email: 'zain@gmail.com',
      password: 'zain1234',
      fullName: 'Zain',
      ic: '030303030303',
      phone: '0123456789',
    },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    // Encrypt sensitive user data
    const encryptedEmail = encrypt(user.email);
    const encryptedFullName = encrypt(user.fullName);
    const encryptedIC = encrypt(user.ic);
    const encryptedPhone = encrypt(user.phone);
    
    await prisma.user.create({
      data: {
        email: encryptedEmail,
        password: hashedPassword,
        fullName: encryptedFullName,
        ic: encryptedIC,
        phone: encryptedPhone,
      },
    });
  }

  console.log('Users seeded successfully with encrypted data');

  // Create admin account
  const adminPassword = await bcrypt.hash('root', 10);
  const encryptedUsername = encrypt('admin');
  
  await prisma.admin.create({
    data: {
      username: encryptedUsername,
      password: adminPassword,
    },
  });

  console.log('Admin account seeded successfully with encrypted username');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 