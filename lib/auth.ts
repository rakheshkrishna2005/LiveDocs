import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export interface JWTPayload {
  userId: string
  email: string
  name: string
  [key: string]: string
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const jwtPayload = payload as Record<string, string>

    if (!jwtPayload.userId || !jwtPayload.email || !jwtPayload.name) {
      return null
    }

    return {
      userId: jwtPayload.userId,
      email: jwtPayload.email,
      name: jwtPayload.name,
    }
  } catch (error) {
    return null
  }
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) return null

    return await verifyToken(token)
  } catch (error) {
    return null
  }
}
