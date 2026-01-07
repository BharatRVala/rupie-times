import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Product from '@/app/lib/models/product';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function GET(request, { params }) {
  try {
    // ✅ Use admin authentication middleware
    const admin = authenticateAdmin(request);

    await connectDB();
    
    // ✅ Await the params in Next.js 16+
    const { id } = await params;

    // Validate product ID
    if (!id) {
      return NextResponse.json({ 
        success: false,
        error: 'Product ID is required' 
      }, { status: 400 });
    }

    const product = await Product.findById(id);
    
    if (!product) {
      return NextResponse.json({ 
        success: false,
        error: 'Product not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product,
      admin: { // ✅ Added admin info
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    
    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Admin authentication required to access product details' 
        },
        { status: 401 }
      );
    }
    
    // ✅ Handle invalid product ID format
    if (error.name === 'CastError') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid product ID format' 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch product: ' + error.message
    }, { status: 500 });
  }
}