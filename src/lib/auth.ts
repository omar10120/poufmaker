import jwt from 'jsonwebtoken';

interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as DecodedToken;
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export function isUpholsterer(role: string): boolean {
  return role === 'upholsterer';
}

export function isAdmin(role: string): boolean {
  return role === 'admin';
}
