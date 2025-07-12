'use server'

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getCurrentAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

// Check if current admin is superadmin
async function isSuperAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return false;
  
  const adminDetails = await prisma.admin.findUnique({
    where: { id: admin.id }
  });
  
  return adminDetails?.username === 'admin';
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
    
    return { admins };
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
    // Check if username already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { username }
    });
    
    if (existingAdmin) {
      return { error: 'Username already exists' };
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new admin
    const newAdmin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword
      }
    });
    
    return { success: true, admin: { id: newAdmin.id, username: newAdmin.username } };
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
//   console.log(id, username, password);
  
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
    
    // Check if username is taken by another admin
    if (username !== existingAdmin.username) {
      const usernameExists = await prisma.admin.findUnique({
        where: { username }
      });
      
      if (usernameExists) {
        return { error: 'Username already exists' };
      }
    }
    
    // Prepare update data
    const updateData: { username: string; password?: string } = { username };
    
    // If password is provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
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
    
    return { success: true, admin: updatedAdmin };
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
    
    // Prevent deleting super   admin account
    if (existingAdmin.username === 'admin') {
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