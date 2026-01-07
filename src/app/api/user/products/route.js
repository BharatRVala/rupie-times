// src/app/api/user/products/route.js
import { NextResponse } from 'next/server';
import { getProductsService } from '@/app/lib/services/productService';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';

    const result = await getProductsService({
      page,
      limit,
      search,
      category
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching products:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products: ' + error.message
    }, { status: 500 });
  }
}