import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Ipo from '@/app/lib/models/Ipo';

export async function GET(req) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Build query - only active IPOs
    const query = { isActive: true };
    
    // Get IPOs sorted by opening date (newest first)
    const ipos = await Ipo.find(query)
      .sort({ openingDate: -1, createdAt: -1 })
      .limit(limit)
      .select('-isActive -createdBy -updatedBy -__v');
    
    return NextResponse.json({
      success: true,
      data: ipos
    });
    
  } catch (error) {
    console.error('Get public IPOs error:', error);
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