// src/app/api/admin/products/[id]/articles/[articleId]/update/route.js - FIXED
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/app/lib/models/product';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

// ✅ PUT - Update an existing article (only allowed fields)
export async function PUT(request, { params }) {
  try {
    const { id, articleId } = await params;

    // ✅ FIXED: Check admin authentication properly
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error 
        },
        { status: authResult.status || 401 }
      );
    }

    // Validate product ID and article ID
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID or article ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      mainHeading,
      description,
      image,
      category,
      isActive
    } = body;

    // Build update object with only allowed fields
    const updateFields = {};
    
    if (mainHeading !== undefined) {
      if (!mainHeading.trim()) {
        return NextResponse.json(
          { success: false, error: 'Main heading cannot be empty' },
          { status: 400 }
        );
      }
      updateFields['articles.$.mainHeading'] = mainHeading.trim();
    }
    
    if (description !== undefined) {
      if (!description.trim()) {
        return NextResponse.json(
          { success: false, error: 'Description cannot be empty' },
          { status: 400 }
        );
      }
      updateFields['articles.$.description'] = description.trim();
    }
    
    if (category !== undefined) {
      if (!category.trim()) {
        return NextResponse.json(
          { success: false, error: 'Category cannot be empty' },
          { status: 400 }
        );
      }
      updateFields['articles.$.category'] = category.trim();
    }
    
    if (image !== undefined) {
      // ✅ FIXED: Handle image update - can be null to remove image or new image object
      if (image === null) {
        // Remove image
        updateFields['articles.$.image'] = {};
      } else if (typeof image === 'object' && image !== null) {
        // Update with new image data
        updateFields['articles.$.image'] = {
          filename: image.filename,
          contentType: image.contentType,
          size: image.size,
          gridfsId: image.gridfsId
        };
      }
    }
    
    if (isActive !== undefined) {
      updateFields['articles.$.isActive'] = isActive;
    }

    // ✅ REMOVED: updatedAt and updatedBy fields since they don't exist in your model

    // Check if at least one field is being updated
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    console.log('🔄 Updating article with fields:', {
      articleId,
      updateFields,
      hasImageUpdate: image !== undefined
    });

    const product = await Product.findOneAndUpdate(
      { 
        _id: id,
        'articles._id': articleId 
      },
      { 
        $set: updateFields
      },
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product or article not found' },
        { status: 404 }
      );
    }

    const updatedArticle = product.articles.id(articleId);

    // ✅ Log the updated article details for debugging
    console.log('✅ Article updated successfully:', {
      articleId: updatedArticle._id.toString(),
      heading: updatedArticle.mainHeading,
      hasImage: !!updatedArticle.image?.filename,
      imageStored: updatedArticle.image ? {
        filename: updatedArticle.image.filename,
        gridfsId: updatedArticle.image.gridfsId
      } : 'No image stored',
      category: updatedArticle.category,
      isActive: updatedArticle.isActive
    });

    // Prepare response data - explicitly select only current fields
    const responseArticle = {
      _id: updatedArticle._id.toString(),
      mainHeading: updatedArticle.mainHeading,
      description: updatedArticle.description,
      category: updatedArticle.category,
      author: updatedArticle.author,
      isActive: updatedArticle.isActive,
      createdAt: updatedArticle.createdAt,
      ...(updatedArticle.image && updatedArticle.image.filename && { image: updatedArticle.image }),
      ...(updatedArticle.sections && updatedArticle.sections.length > 0 && { sections: updatedArticle.sections })
    };

    return NextResponse.json({
      success: true,
      message: 'Article updated successfully',
      article: responseArticle,
      product: {
        id: product._id.toString(),
        heading: product.heading,
        category: product.category
      },
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      }
    });

  } catch (error) {
    console.error('❌ Error updating article:', error);
    
    // Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Admin authentication required to update articles' 
        },
        { status: 401 }
      );
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          success: false,
          error: `Validation error: ${error.message}` 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update article: ' + error.message },
      { status: 500 }
    );
  }
}