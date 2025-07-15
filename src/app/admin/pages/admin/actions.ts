'use server'

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getCurrentAdmin } from '@/lib/auth';
import { encrypt, decrypt } from '@/services/encryption';

const prisma = new PrismaClient();

// Check if current admin is superadmin
async function isSuperAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return false;
  
  // getCurrentAdmin now returns decrypted username, so we can compare directly
  return admin.username === 'admin';
}

// Get all admins
export async function getAdmins() {
  if (!await isSuperAdmin()) {
    return { error: 'Unauthorized access' };
  }
  
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Decrypt usernames before returning
    const decryptedAdmins = admins.map(admin => {
      let decryptedUsername = admin.username;
      try {
        decryptedUsername = decrypt(admin.username);
      } catch (error) {
        console.error('Error decrypting admin username:', error);
        // Use as-is if decryption fails (for backward compatibility)
      }
      
      return {
        ...admin,
        username: decryptedUsername
      };
    });
    
    return { admins: decryptedAdmins };
  } catch (error) {
    console.error('Error fetching admins:', error);
    return { error: 'Failed to fetch admins' };
  }
}

// Create new admin
export async function createAdmin(formData: FormData) {
  if (!await isSuperAdmin()) {
    return { error: 'Unauthorized access' };
  }
  
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  
  if (!username || !password) {
    return { error: 'All fields are required' };
  }
  
  try {
    // Encrypt the username before checking for duplicates
    const encryptedUsername = encrypt(username);
    
    // Check if username already exists by checking all admins and decrypting
    const allAdmins = await prisma.admin.findMany({
      select: {
        username: true
      }
    });
    
    const usernameExists = allAdmins.some(admin => {
      try {
        const decryptedUsername = decrypt(admin.username);
        return decryptedUsername === username;
      } catch {
        // If decryption fails, compare directly (for backward compatibility)
        return admin.username === username;
      }
    });
    
    if (usernameExists) {
      return { error: 'Username already exists' };
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new admin with encrypted username
    const newAdmin = await prisma.admin.create({
      data: {
        username: encryptedUsername,
        password: hashedPassword
      }
    });
    
    return { success: true, admin: { id: newAdmin.id, username: username } };
  } catch (error) {
    console.error('Error creating admin:', error);
    return { error: 'Failed to create admin' };
  }
}

// Update admin
export async function updateAdmin(formData: FormData) {
  if (!await isSuperAdmin()) {
    return { error: 'Unauthorized access' };
  }
  
  const id = formData.get('id') as string;
  const username = formData.get('username') as string;
  const password = formData.get('password') as string | null;
  
  if (!id || !username) {
    return { error: 'Admin ID and username are required' };
  }
  
  try {
    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id }
    });
    
    if (!existingAdmin) {
      return { error: 'Admin not found' };
    }
    
    // Decrypt existing username for comparison
    let existingDecryptedUsername = existingAdmin.username;
    try {
      existingDecryptedUsername = decrypt(existingAdmin.username);
    } catch (error) {
      console.error('Error decrypting existing admin username:', error);
    }
    
    // Check if username is taken by another admin (only if username is being changed)
    if (username !== existingDecryptedUsername) {
      const allAdmins = await prisma.admin.findMany({
        where: {
          id: {
            not: id
          }
        },
        select: {
          username: true
        }
      });
      
             const usernameExists = allAdmins.some(admin => {
         try {
           const decryptedUsername = decrypt(admin.username);
           return decryptedUsername === username;
         } catch {
           // If decryption fails, compare directly (for backward compatibility)
           return admin.username === username;
         }
       });
      
      if (usernameExists) {
        return { error: 'Username already exists' };
      }
    }
    
    // Prepare update data
    const updateData: { username?: string; password?: string } = {};
    
    // Encrypt username if it's being changed
    if (username !== existingDecryptedUsername) {
      updateData.username = encrypt(username);
    }
    
    // If password is provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return { success: true, admin: { id, username, updatedAt: existingAdmin.updatedAt } };
    }
    
    // Update admin
    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        updatedAt: true
      }
    });
    
    // Return with decrypted username
    let decryptedUsername = updatedAdmin.username;
    try {
      decryptedUsername = decrypt(updatedAdmin.username);
    } catch (error) {
      console.error('Error decrypting updated admin username:', error);
    }
    
    return { 
      success: true, 
      admin: {
        ...updatedAdmin,
        username: decryptedUsername
      }
    };
  } catch (error) {
    console.error('Error updating admin:', error);
    return { error: 'Failed to update admin' };
  }
}

// Delete admin
export async function deleteAdmin(formData: FormData) {
  if (!await isSuperAdmin()) {
    return { error: 'Unauthorized access' };
  }
  
  const id = formData.get('id') as string;
  
  if (!id) {
    return { error: 'Admin ID is required' };
  }
  
  try {
    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id }
    });
    
    if (!existingAdmin) {
      return { error: 'Admin not found' };
    }
    
    // Decrypt username to check if it's the superadmin
    let decryptedUsername = existingAdmin.username;
    try {
      decryptedUsername = decrypt(existingAdmin.username);
    } catch (error) {
      console.error('Error decrypting admin username for deletion check:', error);
    }
    
    // Prevent deleting superadmin account
    if (decryptedUsername === 'admin') {
      return { error: 'Cannot delete superadmin account' };
    }
    
    // Delete admin
    await prisma.admin.delete({
      where: { id }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting admin:', error);
    return { error: 'Failed to delete admin' };
  }
} 