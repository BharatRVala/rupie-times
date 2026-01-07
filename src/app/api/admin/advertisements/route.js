import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Advertisement from '@/app/lib/models/Advertisement';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';

export async function POST(req) {
  try {
    await connectDB();
    
    // Authenticate admin
    const auth = authenticateAdmin(req);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }
    
    const body = await req.json();
    
    // Validate required fields
    const requiredFields = ['name', 'position', 'imageFilename', 'imageGridfsId', 'imageContentType', 'imageSize'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // Validate position
    const validPositions = ['top', 'left', 'right', 'center', 'bottom'];
    if (!validPositions.includes(body.position)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Invalid position. Must be one of: ${validPositions.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // Create advertisement
    const advertisement = new Advertisement({
      ...body,
      createdBy: auth.id
    });
    
    await advertisement.save();
    
    // Populate createdBy field for response
    await advertisement.populate('createdBy', 'name email');
    
    return NextResponse.json({
      success: true,
      message: 'Advertisement created successfully',
      data: advertisement
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create advertisement error:', error);
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

export async function GET(req) {
  try {
    await connectDB();
    
    // Authenticate admin
    const auth = authenticateAdmin(req);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const position = searchParams.get('position');
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // active/inactive
    
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    
    if (position && position !== 'all') {
      query.position = position;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    // Get advertisements with pagination
    const advertisements = await Advertisement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    // Get total count
    const total = await Advertisement.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: advertisements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get advertisements error:', error);
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