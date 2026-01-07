// src/app/api/user/products/[id]/route.js
import { NextResponse } from 'next/server';
import { getProductByIdService } from '@/app/lib/services/productService';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Check for user (Authentication)
    let user = null;
    try {
      const authResult = authenticateUser(request);
      if (authResult.success && authResult.id) {
        user = authResult;
      }
    } catch (e) {
      // Treat as guest
    }

    const result = await getProductByIdService({ id, user });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch product: ' + error.message
    }, { status: 500 });
  }
}