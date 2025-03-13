import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pbkdf2Sync } from 'crypto';

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using reset token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find user with valid reset token
    const user = await prisma.users.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: {
          gt: new Date() // Token not expired
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Generate new password hash and salt
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512').toString('hex');

    // Update user's password and clear reset token
    await prisma.users.update({
      where: { Id: user.Id },
      data: {
        passwordHash: hash,
        passwordSalt: salt,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        updatedAt: new Date()
      }
    });

    // Log the password reset
    await prisma.userLoginHistory.create({
      data: {
        userId: user.Id,
        successful: true,
        failureReason: 'Password reset successful',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined
      }
    });

    return NextResponse.json({
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
