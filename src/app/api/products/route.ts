import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with optional filters
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by product status
 *       - in: query
 *         name: creatorId
 *         schema:
 *           type: string
 *         description: Filter by creator ID
 *     responses:
 *       200:
 *         description: List of products
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new product
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               imageUrl:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ai-generated, pending, in-progress, completed]
 *     responses:
 *       201:
 *         description: Product created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const creatorId = searchParams.get('creatorId');

    const where: any = {};
    if (status) where.status = status;
    if (creatorId) where.creatorId = creatorId;

    const products = await prisma.products.findMany({
      where,
      include: {
        creator: {
          select: {
            Id: true,
            fullName: true,
            email: true
          }
        },
        manufacturer: {
          select: {
            Id: true,
            fullName: true,
            email: true
          }
        },
        bids: {
          select: {
            Id: true,
            amount: true,
            status: true,
            upholsterer: {
              select: {
                Id: true,
                fullName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
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

    const { title, description, price, imageUrl, status = 'ai-generated' } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const product = await prisma.products.create({
      data: {
        title,
        description,
        price: price ? parseFloat(price) : null,
        imageUrl,
        status,
        creatorId: decodedToken.userId
      },
      include: {
        creator: {
          select: {
            Id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
