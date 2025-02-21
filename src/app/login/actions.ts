'use server'

export async function login(formData: FormData) {
  try {
    // Add your login logic here
    // This is just a placeholder implementation
    const data = Object.fromEntries(formData.entries());
    console.log('Processing login:', data);
    
    return { success: true };
  } catch (error) {
    console.error('Error logging in:', error);
    return { error: 'Failed to login' };
  }
} 