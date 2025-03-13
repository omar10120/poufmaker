import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and get access token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Check JWT secret
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Login attempt for email:', body.email);

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Test database connection
    try {
      await prisma.$connect();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    const user = await prisma.users.findUnique({
      where: { email: body.email },
      select: {
        Id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        passwordSalt: true,
        role: true,
        emailConfirmed: true
      }
    });

    console.log('User found:', user ? 'yes' : 'no');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!user.emailConfirmed) {
      return NextResponse.json(
        { error: 'Email not confirmed' },
        { status: 401 }
      );
    }

    // Hash the provided password with the stored salt
    let hashedPassword;
    try {
      hashedPassword = crypto
        .pbkdf2Sync(body.password, user.passwordSalt, 1000, 64, 'sha512')
        .toString('hex');
      console.log('Password hashing successful');
    } catch (hashError) {
      console.error('Password hashing error:', hashError);
      return NextResponse.json(
        { error: 'Password verification error' },
        { status: 500 }
      );
    }

    console.log('Password verification:', hashedPassword === user.passwordHash ? 'success' : 'failed');

    if (hashedPassword !== user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token
    let token;
    try {
      token = jwt.sign(
        {
          userId: user.Id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      console.log('JWT token generation successful');
    } catch (jwtError) {
      console.error('JWT token generation error:', jwtError);
      return NextResponse.json(
        { error: 'Token generation error' },
        { status: 500 }
      );
    }

    // Get IP address from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    try {
      // Create session
      await prisma.userSessions.create({
        data: {
          userId: user.Id,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          ipAddress,
          userAgent: request.headers.get('user-agent') || undefined
        }
      });

      // Update last login date
      await prisma.users.update({
        where: { Id: user.Id },
        data: { lastLoginDate: new Date() }
      });

      // Record successful login
      await prisma.userLoginHistory.create({
        data: {
          userId: user.Id,
          ipAddress,
          userAgent: request.headers.get('user-agent') || undefined,
          successful: true
        }
      });

      console.log('Session and history records created successfully');
    } catch (dbError) {
      console.error('Session/history creation error:', dbError);
      // Don't fail the login if session recording fails
    }

    return NextResponse.json({
      token,
      user: {
        Id: user.Id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error details:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
