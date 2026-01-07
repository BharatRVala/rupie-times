// src/app/api/admin/articles/[id]/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import FreeArticle from '@/app/lib/models/article';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

// GET - Get single article
export async function GET(request, { params }) {
  try {
    // Check admin authentication
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error
        },
        { status: authResult.status }
      );
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid article ID'
        },
        { status: 400 }
      );
    }

    const article = await FreeArticle.findById(id).lean();

    if (!article) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      article: {
        ...article,
        _id: article._id.toString()
      }
    });

  } catch (error) {
    console.error('Error fetching article:', error);

    // Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to access articles'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch article: ' + error.message
      },
      { status: 500 }
    );
  }
}

// PUT - Update an article
export async function PUT(request, { params }) {
  try {
    // Check admin authentication
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Prepare update object
    const updateData = {};

    if (body.mainHeading !== undefined) updateData.mainHeading = body.mainHeading.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.category !== undefined) updateData.category = body.category.trim();
    if (body.accessType !== undefined) updateData.accessType = body.accessType;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sections !== undefined) updateData.sections = body.sections;
    if (body.featuredImage !== undefined) updateData.featuredImage = body.featuredImage;

    // Update author info if it's currently an email or not set
    // This helps transition old articles to the new name-based system
    updateData.author = authResult.name || 'Brew Readers';
    updateData.createdBy = authResult.email;

    // Always update updatedAt
    updateData.updatedAt = new Date();

    // Use findByIdAndUpdate to avoid VersionError (atomic update)
    const article = await FreeArticle.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true, lean: true } // Return new doc, run schema validators, and return POJO
    );

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Article updated successfully',
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      article: {
        ...article,
        _id: article._id.toString()
      }
    });

  } catch (error) {
    console.error('Error updating article:', error);

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
      const errors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, error: `Validation failed: ${errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Article with similar data already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update article: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete an article
export async function DELETE(request, { params }) {
  try {
    // Check admin authentication
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const article = await FreeArticle.findByIdAndDelete(id);

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully',
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      deletedArticle: {
        id: article._id.toString(),
        mainHeading: article.mainHeading
      }
    });

  } catch (error) {
    console.error('Error deleting article:', error);

    // Handle authentication errors specifically
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
      { success: false, error: 'Failed to delete article: ' + error.message },
      { status: 500 }
    );
  }
}