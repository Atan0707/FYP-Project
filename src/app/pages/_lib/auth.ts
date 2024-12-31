import { cookies } from 'next/headers';
import { decrypt } from './session';

export async function getSession() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) return null;
  
  const session = await decrypt(sessionCookie);
  return session?.userId ? session : null;
} 