// src/app/api/admin/products/[id]/articles/[articleId]/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/app/lib/models/product';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

// GET - Get single article from product
export async function GET(request, { params }) {
  try {
    const { id, articleId } = await params;

    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json({ success: false, error: 'Invalid IDs' }, { status: 400 });
    }

    await dbConnect();

    await dbConnect();

    // ✅ OPTIMIZED: Fetch ONLY the specific article using positional projection ($)
    // This prevents loading the entire product document (all articles + sections) into memory
    const product = await Product.findOne(
      { _id: id, 'articles._id': articleId },
      { 'articles.$': 1 }
    ).lean();

    if (!product || !product.articles || product.articles.length === 0) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    const article = product.articles[0];

    return NextResponse.json({
      success: true,
      article: {
        ...article,
        _id: article._id.toString()
      }
    });

  } catch (error) {
    console.error("Error fetching product article:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete an article from product
export async function DELETE(request, { params }) {
  try {
    const { id, articleId } = await params;

    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json({ success: false, error: 'Invalid IDs' }, { status: 400 });
    }

    await dbConnect();

    const product = await Product.findByIdAndUpdate(
      id,
      { $pull: { articles: { _id: articleId } } }
    );
    // Note: product here is the document *before* update (by default), checking for null to confirm existence.
    if (!product) {
      // If product didn't exist, we return 404.
      // If product existed but article didn't, the operation is still successful (idempotent),
      // or we can optionally check if we really want to error on missing article, but 
      // standard Delete usually returns success if resource is already gone. 
      // The original code was throwing 500 on save error.
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully'
    });

  } catch (error) {
    console.error("Error deleting product article:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update an article
export async function PUT(request, { params }) {
  try {
    const { id, articleId } = await params;

    // Authenticate
    const admin = authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      mainHeading,
      description,
      category,
      image,
      isActive,
      sections,
      issueDate,
      issueEndDate,
      isFreeTrial
    } = body;



    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json({ success: false, error: 'Invalid IDs' }, { status: 400 });
    }

    await dbConnect();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const article = product.articles.id(articleId);
    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    // Update fields
    if (mainHeading) article.mainHeading = mainHeading;
    if (description) article.description = description;
    if (category) article.category = category;
    if (image !== undefined) article.image = image; // Allow null to unset image
    if (typeof isActive === 'boolean') article.isActive = isActive;
    if (sections) article.sections = sections;

    // ✅ Apply Date and Trial updates
    if (issueDate !== undefined) article.issueDate = issueDate ? new Date(issueDate) : undefined;
    if (issueEndDate !== undefined) article.issueEndDate = issueEndDate ? new Date(issueEndDate) : undefined;
    if (typeof isFreeTrial === 'boolean') article.isFreeTrial = isFreeTrial;

    // Update timestamp if needed, or mongoose handles subdoc updates differently? 
    // Subdocs don't auto-update parent's updatedAt usually, but purely article fields is fine.

    await product.save();

    return NextResponse.json({
      success: true,
      message: 'Article updated successfully',
      article: article
    });

  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}