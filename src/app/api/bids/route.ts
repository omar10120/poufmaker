import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, isUpholsterer } from '@/lib/auth';

/**
 * @swagger
 * /api/bids:
 *   get:
 *     summary: Get all bids with optional filters
 *     tags:
 *       - Bids
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter by product ID
 *       - in: query
 *         name: upholstererId
 *         schema:
 *           type: string
 *         description: Filter by upholsterer ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by bid status
 *     responses:
 *       200:
 *         description: List of bids
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new bid
 *     tags:
 *       - Bids
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - amount
 *             properties:
 *               productId:
 *                 type: string
 *               amount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bid created successfully
 *       401:
 *         description: Unauthorized or not an upholsterer
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const upholstererId = searchParams.get('upholstererId');
    const status = searchParams.get('status');

    const where: any = {};
    if (productId) where.productId = productId;
    if (upholstererId) where.upholstererId = upholstererId;
    if (status) where.status = status;

    const bids = await prisma.bids.findMany({
      where,
      include: {
        product: {
          select: {
            Id: true,
            title: true,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(bids);
  } catch (error) {
    console.error('Error fetching bids:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Check if user is an upholsterer
    if (!isUpholsterer(decodedToken.role)) {
      return NextResponse.json(
        { error: 'Only upholsterers can create bids' },
        { status: 401 }
      );
    }

    const { productId, amount, notes } = await request.json();

    if (!productId || !amount) {
      return NextResponse.json(
        { error: 'Product ID and amount are required' },
        { status: 400 }
      );
    }

    // Check if product exists and is available for bidding
    const product = await prisma.products.findUnique({
      where: { Id: productId },
      select: { status: true }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.status !== 'ai-generated') {
      return NextResponse.json(
        { error: 'Product is not available for bidding' },
        { status: 400 }
      );
    }

    // Check if upholsterer has already bid on this product
    const existingBid = await prisma.bids.findFirst({
      where: {
        productId,
        upholstererId: decodedToken.userId
      }
    });

    if (existingBid) {
      return NextResponse.json(
        { error: 'You have already bid on this product' },
        { status: 400 }
      );
    }

    const bid = await prisma.bids.create({
      data: {
        productId,
        upholstererId: decodedToken.userId,
        amount: parseFloat(amount.toString()),
        notes,
        status: 'pending'
      },
      include: {
        product: {
          select: {
            Id: true,
            title: true,
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

    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    console.error('Error creating bid:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
