import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import SupportTicket from '@/app/lib/models/SupportTicket';
import User from '@/app/lib/models/User'; // Import User model
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function GET(request) {
  try {
    // Check admin authentication using new function
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

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    // Status filter
    if (status !== 'all') {
      query.status = status;
    }

    // Category filter
    if (category !== 'all') {
      query.category = category;
    }

    // Priority filter
    if (priority !== 'all') {
      query.priority = priority;
    }

    // Search filter
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { initialMessage: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { ticketNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Get tickets with pagination
    const tickets = await SupportTicket.find(query)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await SupportTicket.countDocuments(query);

    // Get counts by status for stats
    const statusCounts = {
      all: await SupportTicket.countDocuments(),
      waiting: await SupportTicket.countDocuments({ status: 'waiting' }),
      open: await SupportTicket.countDocuments({ status: 'open' }),
      closed: await SupportTicket.countDocuments({ status: 'closed' })
    };

    return NextResponse.json({
      success: true,
      tickets: tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        statusCounts,
        totalTickets: total
      }
    });

  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch support tickets: ' + error.message
    }, { status: 500 });
  }
}