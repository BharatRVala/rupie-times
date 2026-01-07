//src/app/api/advertisements/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Advertisement from '@/app/lib/models/Advertisement';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const position = searchParams.get('position');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query - only active advertisements
    const query = {
      isActive: true
    };

    if (position && position !== 'all') {
      query.position = position;
    }

    // Get advertisements sorted by creation date (newest first)
    const advertisements = await Advertisement.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-isActive -createdBy -updatedBy -__v -clicks -impressions -imageGridfsId -imageContentType -imageSize');

    // Increment impressions for each ad
    await Promise.all(advertisements.map(ad =>
      Advertisement.findByIdAndUpdate(ad._id, {
        $inc: { impressions: 1 }
      })
    ));

    return NextResponse.json({
      success: true,
      data: advertisements
    });

  } catch (error) {
    console.error('Get public advertisements error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
        error: error.message
      },
      { status: 500 }
    );
  }
}

