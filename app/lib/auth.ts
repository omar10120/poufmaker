import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch (error) {
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function isUpholsterer(role: string): boolean {
  return role === 'upholsterer';
}

export function isUpholstererRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader || '');
  if (!token) return false;

  const payload = verifyToken(token);
  return payload?.role ? isUpholsterer(payload.role) : false;
}
