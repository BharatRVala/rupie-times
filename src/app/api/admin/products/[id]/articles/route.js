// src/app/api/admin/products/[id]/articles/route.js - FIXED IMAGE STORAGE
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/app/lib/models/product';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

// ✅ GET - Get all articles for a specific product
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // ✅ Check admin authentication
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

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Fetch product - Exclude sections from articles for the list view to reduce payload size
    const product = await Product.findById(id, {
      heading: 1,
      shortDescription: 1,
      category: 1,
      'articles.mainHeading': 1,
      'articles.description': 1,
      'articles.image': 1,
      'articles.category': 1,
      'articles.author': 1,
      'articles.isActive': 1,
      'articles.issueDate': 1,
      'articles.issueEndDate': 1,

      'articles.createdAt': 1,
      'articles._id': 1
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Sort articles by creation date (newest first)
    const sortedArticles = product.articles
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(article => ({
        ...article.toObject(),
        _id: article._id.toString()
      }));

    return NextResponse.json({
      success: true,
      product: {
        id: product._id.toString(),
        heading: product.heading,
        shortDescription: product.shortDescription,
        category: product.category
      },
      articles: sortedArticles,
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      }
    });

  } catch (error) {
    console.error('Error fetching product articles:', error);

    // Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to access product articles'
        },
        { status: 401 }
      );
    }

    // Handle invalid product ID format
    if (error.name === 'CastError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID format'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch product articles: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    // ✅ Check admin authentication
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

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      mainHeading,
      description,
      image,
      category,
      sections = [],
      isActive = true,
      issueDate,
      issueEndDate
    } = body;

    // Validate issue dates
    if (!issueDate || !issueEndDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Issue Start Date and End Date are required'
        },
        { status: 400 }
      );
    }

    // ✅ Get current time for createdAt
    const currentTime = new Date();

    /* 
    console.log('🆕 Creating new article with image data:', {
      mainHeading,
      hasImage: !!image,
      imageData: image ? {
        filename: image.filename,
        gridfsId: image.gridfsId,
        contentType: image.contentType,
        size: image.size
      } : 'No image'
    });
    */

    // ✅ FIXED: Properly structure the image object according to your model
    const imageData = image ? {
      filename: image.filename,
      contentType: image.contentType,
      size: image.size,
      gridfsId: image.gridfsId
    } : {};

    // ✅ STRICTLY CREATE ONLY THE FIELDS IN YOUR CURRENT MODEL
    const newArticle = {
      _id: new mongoose.Types.ObjectId(),
      mainHeading,
      description,
      image: imageData,
      category,
      author: authResult.name || authResult.email || 'Brew Readers', // Required field
      sections: sections.map(section => ({
        ...section,
        _id: new mongoose.Types.ObjectId(),
        contentBlocks: section.contentBlocks ? section.contentBlocks.map(block => ({
          ...block,
          _id: new mongoose.Types.ObjectId()
        })) : []
      })),
      isActive,
      issueDate: issueDate ? new Date(issueDate) : undefined,
      issueEndDate: issueEndDate ? new Date(issueEndDate) : undefined,
      createdAt: currentTime
      // ✅ EXPLICITLY EXCLUDE: publishDate, order, updatedAt
    };

    // Use findByIdAndUpdate with proper options
    const product = await Product.findByIdAndUpdate(
      id,
      {
        $push: {
          articles: {
            $each: [newArticle],
            $position: 0
          }
        }
      },
      {
        new: true,
        runValidators: true,
        // Force schema validation
        strict: true
      }
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get the newly added article (should be first in array due to $position: 0)
    const addedArticle = product.articles[0];

    // console.log('✅ Article created successfully:', {
    //   articleId: addedArticle._id.toString(),
    //   heading: addedArticle.mainHeading,
    //   author: addedArticle.author,
    //   hasImage: !!addedArticle.image,
    //   imageStored: addedArticle.image ? {
    //     filename: addedArticle.image.filename,
    //     gridfsId: addedArticle.image.gridfsId
    //   } : 'No image stored',
    //   createdAt: addedArticle.createdAt,
    //   // Check for unwanted fields
    //   hasPublishDate: 'publishDate' in addedArticle,
    //   hasOrder: 'order' in addedArticle,
    //   hasUpdatedAt: 'updatedAt' in addedArticle
    // });

    // Prepare response data - explicitly select only current fields
    const responseArticle = {
      _id: addedArticle._id.toString(),
      mainHeading: addedArticle.mainHeading,
      description: addedArticle.description,
      category: addedArticle.category,
      author: addedArticle.author,
      isActive: addedArticle.isActive,
      issueDate: addedArticle.issueDate,
      issueEndDate: addedArticle.issueEndDate,
      createdAt: addedArticle.createdAt,
      ...(addedArticle.image && { image: addedArticle.image }),
      ...(addedArticle.sections && addedArticle.sections.length > 0 && { sections: addedArticle.sections })
    };

    return NextResponse.json({
      success: true,
      message: 'Article created successfully.',
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
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating article in product:', error);

    // Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to create articles'
        },
        { status: 401 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${error.message} `
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create article: ' + error.message },
      { status: 500 }
    );
  }
}