import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import User from '@/app/lib/models/User';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request) {
  try {
    const user = authenticateUser(request);

    if (!user.success) {
      return NextResponse.json(
        { success: false, error: user.error },
        { status: user.status }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const articleId = searchParams.get('articleId');
    const freeArticleId = searchParams.get('freeArticleId');

    const userData = await User.findById(user.id);
    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    let isFavorite = false;
    let type = '';

    // ✅ UPDATED: Check articles only
    if (freeArticleId) {
      isFavorite = userData.isFreeArticleInFavorites(freeArticleId);
      type = 'freeArticle';
    } else if (articleId && productId) {
      isFavorite = userData.isArticleInFavorites(productId, articleId);
      type = 'article';
    } else {
      return NextResponse.json(
        { success: false, error: 'No valid ID provided for Article/FreeArticle' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      isFavorite,
      type
    });

  } catch (error) {
    console.error('Error checking favorite status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check favorite status: ' + error.message },
      { status: 500 }
    );
  }
}