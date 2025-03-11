import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/conversations/{id}:
 *   get:
 *     summary: Get a conversation by ID with its messages
 *     tags:
 *       - Conversations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation details with messages
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
interface RouteParams {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    const conversation = await prisma.conversations.findUnique({
      where: { Id: params.id },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        user: {
          select: {
            Id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/conversations/{id}:
 *   delete:
 *     summary: Delete a conversation and all its messages
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<Response> {
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

    const conversation = await prisma.conversations.findUnique({
      where: { Id: params.id },
      select: { userId: true }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Only allow users to delete their own conversations
    if (conversation.userId && conversation.userId !== decodedToken.userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this conversation' },
        { status: 401 }
      );
    }

    // Delete conversation (this will cascade delete messages due to the relation)
    await prisma.$transaction([
      prisma.messages.deleteMany({
        where: { conversationId: params.id }
      }),
      prisma.conversations.delete({
        where: { Id: params.id }
      })
    ]);

    return NextResponse.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
