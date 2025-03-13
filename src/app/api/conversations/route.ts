import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Get all conversations
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: List of conversations
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where = userId ? { userId } : {};

    const conversations = await prisma.conversations.findMany({
      where,
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Get only the latest message
        },
        user: {
          select: {
            Id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Create a new conversation
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *               userPhone:
 *                 type: string
 *               initialMessage:
 *                 type: string
 *                 required: true
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    let userId: string | null = null;

    if (token) {
      const decodedToken = verifyToken(token);
      if (decodedToken) {
        userId = decodedToken.userId;
      }
    }

    const { userName, userPhone, initialMessage } = await request.json();

    if (!initialMessage) {
      return NextResponse.json(
        { error: 'Initial message is required' },
        { status: 400 }
      );
    }

    // Create conversation and initial message in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversations.create({
        data: {
          userId: userId || undefined,
          userName: userName || undefined,
          userPhone: userPhone || undefined
        }
      });

      const message = await tx.messages.create({
        data: {
          conversationId: conversation.Id,
          content: initialMessage,
          isUser: true
        }
      });

      return { conversation, message };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
