import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import FreeArticle from '@/app/lib/models/article';
import Admin from '@/app/lib/models/Admin';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

// GET - Get all articles with pagination and filtering
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || 'all';
    const accessType = searchParams.get('accessType') || 'all';

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { mainHeading: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    if (accessType !== 'all') {
      query.accessType = accessType;
    }

    // Get total count for pagination
    const total = await FreeArticle.countDocuments(query);

    const isMinimal = searchParams.get('minimal') === 'true';
    const projection = isMinimal
      ? 'mainHeading createdAt category description'
      : 'mainHeading description category author createdAt isActive isImportant accessType featuredImage';

    // Get articles with pagination
    const articles = await FreeArticle.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(projection)
      .lean();

    // Resolve Author Names (if emails)
    const authorEmails = [...new Set(
      articles
        .map(a => a.author)
        .filter(author => author && author.includes('@'))
    )];

    const authorMap = new Map();
    if (authorEmails.length > 0) {
      try {
        const admins = await Admin.find({ email: { $in: authorEmails } }).select('email name');
        admins.forEach(a => authorMap.set(a.email, a.name));
      } catch (err) {
        console.error('Error resolving author names in admin list:', err);
      }
    }

    const resolvedArticles = articles.map(article => {
      let displayAuthor = article.author;
      if (displayAuthor && displayAuthor.includes('@')) {
        displayAuthor = authorMap.get(displayAuthor) || displayAuthor;
      }
      return {
        ...article,
        author: displayAuthor,
        _id: article._id.toString()
      };
    });

    return NextResponse.json({
      success: true,
      articles: resolvedArticles,
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching articles:', error);

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
      { success: false, error: 'Failed to fetch articles: ' + error.message },
      { status: 500 }
    );
  }
}

// POST - Create new article
export async function POST(request) {
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

    const body = await request.json();
    const {
      mainHeading,
      description,
      category,
      accessType = 'withoutlogin',
      isActive = true,
      featuredImage = null
    } = body;

    const newArticle = new FreeArticle({
      mainHeading: (mainHeading || '').trim(),
      description: (description || '').trim(),
      category: (category || '').trim(),
      author: authResult.name || 'Brew Readers', // Auto get from cookies
      createdBy: authResult.email,
      accessType,
      isActive,
      featuredImage,
      sections: []
    });

    await newArticle.save();

    return NextResponse.json({
      success: true,
      message: 'Article created successfully',
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      article: {
        ...newArticle.toObject(),
        _id: newArticle._id.toString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating article:', error);

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

    return NextResponse.json(
      { success: false, error: 'Failed to create article: ' + error.message },
      { status: 500 }
    );
  }
}