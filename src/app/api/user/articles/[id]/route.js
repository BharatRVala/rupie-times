// src/app/api/user/articles/[id]/route.js
import { NextResponse } from 'next/server';
import { authenticateUser } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';
import FreeArticle, { ReadingProgress } from '@/app/lib/models/article'; // Needed for POST
import { getArticleByIdService } from '@/app/lib/services/articleService';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Authentication
    let user = null;
    const authResult = authenticateUser(request);
    if (authResult.success) {
      user = authResult;
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'light' or 'full'

    const result = await getArticleByIdService({ id, user, mode });

    if (!result.success) {
      return NextResponse.json(result, { status: result.status || 500 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch article' }, { status: 500 });
  }
}

// POST - Mark section as read
export async function POST(request, { params }) {
  try {
    await dbConnect();

    const { id } = await params;

    // Auth Check
    const authResult = authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const userId = authResult.id;

    const body = await request.json();
    const { sectionId, timeSpent = 0, isRead = true } = body;

    if (!sectionId) {
      return NextResponse.json({ success: false, error: 'Section ID required' }, { status: 400 });
    }

    // Verify article
    const article = await FreeArticle.findById(id);
    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    // Verify section exists
    const sectionExists = article.sections.some(s => s._id.toString() === sectionId);
    if (!sectionExists) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }

    // Find/Create Progress
    let readingProgress = await ReadingProgress.getUserProgress(userId, id);
    if (!readingProgress) {
      readingProgress = new ReadingProgress({
        userId,
        articleId: id,
        readSections: []
      });
    }

    if (isRead) {
      // Mark specific section as read
      readingProgress.markSectionAsRead(sectionId, timeSpent);
    } else {
      // Unmark section (Remove from readSections)
      readingProgress.readSections = readingProgress.readSections.filter(
        s => s.sectionId.toString() !== sectionId
      );
    }

    // Calculate progress with new method
    const progressData = readingProgress.calculateProgress(article);

    // Save the progress
    await readingProgress.save();

    return NextResponse.json({
      success: true,
      readingProgress: {
        readSections: readingProgress.readSections,
        completed: progressData.completed,
        readPercentage: progressData.readPercentage,
        totalReadingTime: readingProgress.totalReadingTime,
        lastReadAt: readingProgress.lastReadAt,
        readSectionsCount: progressData.readSectionsCount,
        totalSections: progressData.totalSections,
        progressText: progressData.progressText
      },
      message: isRead ? (progressData.completed ? 'Article completed!' : 'Progress saved') : 'Progress updated'
    });

  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to update progress' }, { status: 500 });
  }
}