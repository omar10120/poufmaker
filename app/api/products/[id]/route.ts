import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

type RouteSegment = { id: string };

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update a product
 *     tags:
 *       - Products
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
 *       200:
 *         description: Product updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete a product
 *     tags:
 *       - Products
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
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteSegment> }
) {
  try {
    const { id } = await params;
    const product = await prisma.products.findUnique({
      where: { Id: id },
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
            notes: true,
            createdAt: true,
            upholsterer: {
              select: {
                Id: true,
                fullName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteSegment> }
) {
  try {
    const { id } = await params;
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

    const product = await prisma.products.findUnique({
      where: { Id: id },
      select: { creatorId: true }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Only allow creator to update their own products
    if (product.creatorId !== decodedToken.userId) {
      return NextResponse.json(
        { error: 'Not authorized to update this product' },
        { status: 401 }
      );
    }

    const { title, description, price, imageUrl, status } = await request.json();
    const updateData: any = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price !== undefined) updateData.price = price ? parseFloat(price) : null;
    if (imageUrl) updateData.imageUrl = imageUrl;
    if (status) updateData.status = status;

    const updatedProduct = await prisma.products.update({
      where: { Id: id },
      data: updateData,
      include: {
        creator: {
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
      }
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteSegment> }
) {
  try {
    const { id } = await params;
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

    const product = await prisma.products.findUnique({
      where: { Id: id },
      select: { creatorId: true }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Only allow creator to delete their own products
    if (product.creatorId !== decodedToken.userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this product' },
        { status: 401 }
      );
    }

    await prisma.products.delete({
      where: { Id: id }
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
