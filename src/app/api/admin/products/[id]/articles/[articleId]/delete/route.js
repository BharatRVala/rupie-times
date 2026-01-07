// src/app/api/admin/products/[id]/articles/[articleId]/delete/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/app/lib/models/product';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

// DELETE - Remove article from product
export async function DELETE(request, { params }) {
  try {
    const { id, articleId } = await params;
    
    // ✅ Check admin authentication (updated pattern)
    const admin = authenticateAdmin(request);

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid product ID or article ID' 
        },
        { status: 400 }
      );
    }


    const product = await Product.findByIdAndUpdate(
      id,
      { $pull: { articles: { _id: articleId } } },
      { new: true }
    );

    if (!product) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Product or article not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully',
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Error deleting article:', error);
    
    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Admin authentication required to delete articles' 
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete article: ' + error.message 
      },
      { status: 500 }
    );
  }
}