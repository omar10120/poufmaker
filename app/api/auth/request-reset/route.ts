import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

/**
 * @swagger
 * /api/auth/request-reset:
 *   post:
 *     summary: Request a password reset
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate reset token and expiry
    const resetToken = crypto.randomUUID();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Update user with reset token
    await prisma.users.update({
      where: { Id: user.Id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetExpiry
      }
    });

    // Send reset email
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
    const emailContent = `
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: emailContent
    });

    return NextResponse.json({
      message: 'Password reset instructions sent to your email'
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
