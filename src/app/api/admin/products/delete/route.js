import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Product from '@/app/lib/models/product';
import { GridFSBucket, ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function DELETE(request) {
  try {
    // console.log('Starting product deletion process...');

    // ✅ Use updated admin authentication middleware
    const result = authenticateAdmin(request);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    const admin = result;
    // console.log('Admin authenticated for deletion:', admin.email);

    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 });
    }

    // Find product first
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    // console.log('Deleting product:', product.heading, 'by admin:', admin.email);

    // SOFT DELETE: Update isDeleted flag and deactivate
    // We DO NOT delete the file from GridFS to preserve history for existing orders/subscriptions

    product.isDeleted = true;
    product.isActive = false;
    await product.save();

    // Deleted product metadata - actually just updated
    // await Product.findByIdAndDelete(productId);

    // console.log('Product metadata deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      deletedProduct: { // ✅ Added deleted product info for reference
        id: product._id,
        heading: product.heading,
        filename: product.filename
      },
      admin: { // ✅ Added admin info
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Delete product error:', error);

    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to delete products'
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

    // ✅ Handle GridFS deletion errors
    if (error.message.includes('GridFS') || error.message.includes('file not found')) {
      // console.log('GridFS deletion issue, continuing with product metadata deletion...');
      // Continue with product deletion even if GridFS file deletion fails
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to delete product: ' + error.message
    }, { status: 500 });
  }
}