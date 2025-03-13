import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Route Segment Config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Route Types
type Context = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

/**
 * @swagger
 * /api/bids/{id}:
 *   get:
 *     summary: Get a bid by ID
 *     tags:
 *       - Bids
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bid details
 *       404:
 *         description: Bid not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update a bid
 *     tags:
 *       - Bids
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               amount:
 *                 type: number
 *               notes:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, rejected]
 *     responses:
 *       200:
 *         description: Bid updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bid not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete a bid
 *     tags:
 *       - Bids
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
 *         description: Bid deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bid not found
 *       500:
 *         description: Server error
 */

// GET handler
export async function GET(
  request: NextRequest,
  context: Context & { params: Promise<Context['params']> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const bid = await prisma.bids.findUnique({
      where: { Id: id },
      include: {
        product: {
          select: {
            Id: true,
            title: true,
            description: true,
            status: true,
            creator: {
              select: {
                Id: true,
                fullName: true,
                email: true
              }
            }
          }
        },
        upholsterer: {
          select: {
            Id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!bid) {
      return new Response(JSON.stringify({ error: 'Bid not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(bid), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching bid:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT handler
export async function PUT(
  request: NextRequest,
  context: Context & { params: Promise<Context['params']> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authorization token required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const bid = await prisma.bids.findUnique({
      where: { Id: id },
      include: {
        product: {
          select: {
            creatorId: true
          }
        }
      }
    });

    if (!bid) {
      return new Response(JSON.stringify({ error: 'Bid not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { amount, notes, status } = await request.json();
    const updateData: any = {};

    // Only upholsterer can update amount and notes
    if (bid.upholstererId === decodedToken.userId) {
      if (amount !== undefined) updateData.amount = parseFloat(amount);
      if (notes !== undefined) updateData.notes = notes;
    }
    // Only product creator can update status
    else if (bid.product.creatorId === decodedToken.userId) {
      if (status) updateData.status = status;
    } else {
      return new Response(JSON.stringify({ error: 'Not authorized to update this bid' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedBid = await prisma.bids.update({
      where: { Id: id },
      data: updateData,
      include: {
        product: {
          select: {
            Id: true,
            title: true,
            description: true,
            status: true,
            creator: {
              select: {
                Id: true,
                fullName: true,
                email: true
              }
            }
          }
        },
        upholsterer: {
          select: {
            Id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    // If the bid is accepted, reject all other bids for this product
    if (status === 'accepted') {
      await prisma.bids.updateMany({
        where: {
          productId: bid.productId,
          Id: { not: id }
        },
        data: { status: 'rejected' }
      });
    }

    return new Response(JSON.stringify(updatedBid), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating bid:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE handler
export async function DELETE(
  request: NextRequest,
  context: Context & { params: Promise<Context['params']> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authorization token required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const bid = await prisma.bids.findUnique({
      where: { Id: id },
      include: {
        product: {
          select: {
            creatorId: true
          }
        }
      }
    });

    if (!bid) {
      return new Response(JSON.stringify({ error: 'Bid not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only the upholsterer who created the bid or the product creator can delete it
    if (bid.upholstererId !== decodedToken.userId && bid.product.creatorId !== decodedToken.userId) {
      return new Response(JSON.stringify({ error: 'Not authorized to delete this bid' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await prisma.bids.delete({
      where: { Id: id }
    });

    return new Response(JSON.stringify({ message: 'Bid deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting bid:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
