import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Ipo from '@/app/lib/models/Ipo';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

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
    const requiredFields = ['company', 'openingDate', 'closingDate', 'issuePrice'];
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

    // Parse dates
    const openingDate = new Date(body.openingDate);
    const closingDate = new Date(body.closingDate);

    if (isNaN(openingDate.getTime()) || isNaN(closingDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid date format. Please use valid dates.'
        },
        { status: 400 }
      );
    }

    if (openingDate > closingDate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Opening date cannot be after closing date.'
        },
        { status: 400 }
      );
    }

    // Create IPO
    const ipo = new Ipo({
      company: body.company,
      openingDate: openingDate,
      closingDate: closingDate,
      issuePrice: body.issuePrice,
      link: body.link,
      createdBy: auth.id
    });

    await ipo.save();

    return NextResponse.json({
      success: true,
      message: 'IPO created successfully',
      data: ipo
    }, { status: 201 });

  } catch (error) {
    console.error('Create IPO error:', error);
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
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build query - only show active IPOs
    let query = { isActive: true };

    if (search) {
      query.company = { $regex: search, $options: 'i' };
    }

    // Get IPOs with pagination
    const ipos = await Ipo.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    // Get total count
    const total = await Ipo.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: ipos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get IPOs error:', error);
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