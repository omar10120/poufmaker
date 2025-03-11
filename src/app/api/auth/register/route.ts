import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateConfirmationEmail, sendEmail } from '@/lib/email';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
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
 *               - fullName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [client, upholsterer, admin]
 *                 default: client
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *       400:
 *         description: Invalid input or email already exists
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, phoneNumber, role = 'client' } = await request.json();

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
      select: { Id: true }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Generate password salt and hash
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');

    // Generate confirmation token
    const confirmationToken = crypto.randomUUID();

    // Create user
    const user = await prisma.users.create({
      data: {
        email,
        fullName,
        phoneNumber,
        passwordHash: hash,
        passwordSalt: salt,
        role,
        confirmationToken,
        emailConfirmed: false
      },
      select: {
        Id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    // Get IP address from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Record registration in login history
    await prisma.userLoginHistory.create({
      data: {
        userId: user.Id,
        ipAddress,
        userAgent: request.headers.get('user-agent') || undefined,
        successful: true,
        failureReason: 'Registration successful'
      }
    });

    // Send confirmation email
    const emailData = generateConfirmationEmail(email, confirmationToken);
    const emailSent = await sendEmail(emailData);

    if (!emailSent) {
      console.error('Failed to send confirmation email to:', email);
      // Don't return an error to the client, but log it for monitoring
    }

    return NextResponse.json({
      message: 'Registration successful. Please check your email to confirm your account.',
      userId: user.Id
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
