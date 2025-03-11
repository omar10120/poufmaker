import { NextRequest, NextResponse } from 'next/server';

export type RouteHandler<T = void> = (
  req: NextRequest,
  context: { params: T }
) => Promise<NextResponse> | NextResponse;

export type RouteHandlerWithId = RouteHandler<{ id: string }>;
