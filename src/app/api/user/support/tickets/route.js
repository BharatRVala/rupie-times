// src/app/api/user/support/tickets/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import SupportTicket from '@/app/lib/models/SupportTicket';
import User from '@/app/lib/models/User';
import Admin from '@/app/lib/models/Admin';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request) {
    try {
        // ✅ Updated authentication - uses new middleware pattern
        // Authentication
        const user = await authenticateUser(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'all';
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;

        const skip = (page - 1) * limit;

        // Build query
        let query = { user: user.id };

        // Status filter
        if (status !== 'all') {
            query.status = status;
        }

        // Get user's tickets with pagination
        const tickets = await SupportTicket.find(query)
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await SupportTicket.countDocuments(query);

        // Get counts by status for stats
        const statusCounts = {
            all: await SupportTicket.countDocuments({ user: user.id }),
            waiting: await SupportTicket.countDocuments({ user: user.id, status: 'waiting' }),
            open: await SupportTicket.countDocuments({ user: user.id, status: 'open' }),
            closed: await SupportTicket.countDocuments({ user: user.id, status: 'closed' })
        };

        return NextResponse.json({
            success: true,
            tickets: tickets,
            user: { // ✅ Added user info
                id: user.id,
                name: user.name,
                email: user.email
            },
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
        console.error('Error fetching user tickets:', error);

        // ✅ Handle authentication errors specifically
        if (error.message.includes('authentication failed')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required to access support tickets'
                },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: false,
            error: 'Failed to fetch tickets: ' + error.message
        }, { status: 500 });
    }
}