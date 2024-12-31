import 'server-only';
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const cookie = {
    name: 'session',
    option: {
        httpOnly: true, 
        secure: true, 
        sameSite: 'lax' as const, 
        path: '/'
    },
    duration: 2 * 60 * 60 * 1000,
}

type SessionPayload = {
    userId: string;
    expires?: Date;
};

export async function encrypt(payload: SessionPayload) {
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(JWT_SECRET);
    return token;
}

export async function decrypt(session: string | undefined) {
    try {
        if (!session) return null;
        const { payload } = await jwtVerify(session, JWT_SECRET, {
            algorithms: ['HS256']
        })
        return payload;
    } catch (error) {
        console.log(error);
        return null;
    }
}

export async function createSession(userId: string) {
    const expires = new Date(Date.now() + cookie.duration);
    const session = await encrypt({userId, expires});

    (await cookies()).set(cookie.name, session, {...cookie.option, expires});
    redirect('/pages/dashboard');
}

export async function verifySession() {
    const sessionCookie: string | undefined = (await cookies()).get(cookie.name)?.value;
    const session = await decrypt(sessionCookie);
    if (!session?.userId) {
        redirect('/pages/login');
    }
    return {userId: session.userId};
}

export async function deleteSession() {
    (await cookies()).delete(cookie.name);
    redirect('/pages/login');
}