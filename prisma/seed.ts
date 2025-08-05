import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { encrypt, decrypt } from '../src/services/encryption';

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
    {
      email: 'harizhakim84@gmail.com',
      password: 'Hariz1234',
      fullName: 'Jamal',
      ic: '080808080808',
      phone: '0123456789',
    },
    {
      email: 'harizhakim85@gmail.com',
      password: 'Hariz1234',
      fullName: 'Hariz Hakim',
      ic: '090909090909',
      phone: '0123456789',
    },
  ];

  for (const user of users) {
    // Check if user already exists by decrypting existing records
    const existingUsers = await prisma.user.findMany();
    let userExists = false;
    
    for (const existingUser of existingUsers) {
      try {
        const decryptedEmail = decrypt(existingUser.email);
        const decryptedIC = decrypt(existingUser.ic);
        
        if (decryptedEmail === user.email || decryptedIC === user.ic) {
          userExists = true;
          console.log(`User with email ${user.email} or IC ${user.ic} already exists, skipping...`);
          break;
        }
      } catch {
        // Handle case where data might not be encrypted (backward compatibility)
        if (existingUser.email === user.email || existingUser.ic === user.ic) {
          userExists = true;
          console.log(`User with email ${user.email} or IC ${user.ic} already exists, skipping...`);
          break;
        }
      }
    }
    
    if (!userExists) {
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
      
      console.log(`User ${user.fullName} created successfully`);
    }
  }

  console.log('Users seeded successfully with encrypted data');

  // Create admin account
  const adminUsername = 'admin';
  
  // Check if admin already exists by decrypting existing records
  const existingAdmins = await prisma.admin.findMany();
  let adminExists = false;
  
  for (const existingAdmin of existingAdmins) {
    try {
      const decryptedUsername = decrypt(existingAdmin.username);
      
      if (decryptedUsername === adminUsername) {
        adminExists = true;
        console.log(`Admin with username ${adminUsername} already exists, skipping...`);
        break;
      }
    } catch {
      // Handle case where data might not be encrypted (backward compatibility)
      if (existingAdmin.username === adminUsername) {
        adminExists = true;
        console.log(`Admin with username ${adminUsername} already exists, skipping...`);
        break;
      }
    }
  }
  
  if (!adminExists) {
    const adminPassword = await bcrypt.hash('root', 10);
    const encryptedUsername = encrypt(adminUsername);
    
    await prisma.admin.create({
      data: {
        username: encryptedUsername,
        password: adminPassword,
      },
    });
    
    console.log('Admin account created successfully with encrypted username');
  }

  console.log('Seeding completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 