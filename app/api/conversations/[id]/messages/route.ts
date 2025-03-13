import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/conversations/{id}/messages:
 *   get:
 *     summary: Get all messages in a conversation
 *     tags:
 *       - Messages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of messages
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */

type RouteSegment = { id: string };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteSegment> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before');

    // Verify conversation exists
    const conversation = await prisma.conversations.findUnique({
      where: { Id: id }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const where: any = {
      conversationId: id
    };

    if (before) {
      where.createdAt = {
        lt: new Date(before)
      };
    }

    const messages = await prisma.messages.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/conversations/{id}/messages:
 *   post:
 *     summary: Add a new message to a conversation
 *     tags:
 *       - Messages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               isUser:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Message created successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteSegment> }
) {
  try {
    const { id } = await params;
    
    // Verify conversation exists
    const conversation = await prisma.conversations.findUnique({
      where: { Id: id }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const { content, isUser = true } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Create message and update conversation timestamp in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.messages.create({
        data: {
          conversationId: id,
          content,
          isUser
        }
      });

      // Update conversation timestamp
      await tx.conversations.update({
        where: { Id: id },
        data: { updatedAt: new Date() }
      });

      return message;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
