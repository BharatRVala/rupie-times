// src/app/api/user/articles/route.js
import { NextResponse } from 'next/server';
import { authenticateUser } from '@/app/lib/middleware/auth';
import { getArticlesService } from '@/app/lib/services/articleService';

// GET - Get articles for user with access control
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // ✅ Authentication
    let user = null;
    const authResult = authenticateUser(request);
    if (authResult.success) {
      user = authResult;
    }

    const result = await getArticlesService({
      page,
      limit,
      search,
      category,
      sortBy,
      sortOrder,
      user
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching user articles:', error);
    if (error.name === 'MongoNetworkError') {
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles: ' + error.message },
      { status: 500 }
    );
  }
}