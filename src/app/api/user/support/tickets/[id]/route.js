import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import SupportTicket from '@/app/lib/models/SupportTicket';
import { authenticateUser } from '@/app/lib/middleware/auth';


export async function GET(request, { params }) {
    try {
        // ✅ Updated authentication - uses new middleware pattern
        // Authentication
        const user = await authenticateUser(request);
        if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

        await connectDB();

        // ✅ Await the params in Next.js 16+
        const { id } = await params;

        const ticket = await SupportTicket.findOne({
            _id: id,
            user: user.id // Ensure user can only access their own tickets
        })
            .populate('assignedTo', 'name email')
            .populate('messages.user', 'name email');

        if (!ticket) {
            return NextResponse.json(
                { success: false, error: 'Ticket not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            ticket: ticket,
            user: { // ✅ Added user info
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Error fetching user ticket:', error);

        // ✅ Handle authentication errors specifically
        if (error.message.includes('authentication failed')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required to access ticket details'
                },
                { status: 401 }
            );
        }

        // ✅ Handle invalid ticket ID format
        if (error.name === 'CastError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid ticket ID format'
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: false,
            error: 'Failed to fetch ticket: ' + error.message
        }, { status: 500 });
    }
}

// User reply to ticket
export async function POST(request, { params }) {
    try {
        // ✅ Updated authentication - uses new middleware pattern
        // Authentication
        const user = await authenticateUser(request);
        if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

        await connectDB();

        // ✅ Await the params in Next.js 16+
        const { id } = await params;
        const body = await request.json();
        const { message, attachments } = body;

        if (!message && (!attachments || attachments.length === 0)) {
            return NextResponse.json(
                { success: false, error: 'Message or attachment is required' },
                { status: 400 }
            );
        }

        const ticket = await SupportTicket.findOne({
            _id: id,
            user: user.id // Ensure user can only reply to their own tickets
        });

        if (!ticket) {
            return NextResponse.json(
                { success: false, error: 'Ticket not found' },
                { status: 404 }
            );
        }

        // Check if ticket is open for messaging
        // Allow messaging unless strictly closed (allows 'waiting', 'open', 'resolved' -> reopen)
        if (ticket.status === 'closed') {
            return NextResponse.json(
                { success: false, error: 'Cannot send message. Ticket is closed.' },
                { status: 400 }
            );
        }

        // Add user message
        const messageData = {
            user: user.id,
            message: message.trim(),
            isAdmin: false,
            attachments: attachments || [] // ✅ Support attachments
        };

        await ticket.addMessage(messageData);

        // Populate the updated ticket
        const updatedTicket = await SupportTicket.findById(id)
            .populate('assignedTo', 'name email')
            .populate('messages.user', 'name email');

        // Emit Socket.io event for real-time message
        try {
            const lastMessage = updatedTicket.messages[updatedTicket.messages.length - 1];
            // Serialize to clean JSON
            const cleanMessage = JSON.parse(JSON.stringify(lastMessage));

            const eventPayload = {
                ...cleanMessage,
                user: cleanMessage.user || { name: user.name, email: user.email }
            };

            if (global.io) {
                global.io.to(`ticket-${id}`).emit('receive_message', eventPayload);
            }

        } catch (socketError) {
            console.error('Socket Emit Error:', socketError);
            // Don't fail the request if real-time update fails, just log it
        }

        return NextResponse.json({
            success: true,
            message: 'Reply sent successfully',
            ticket: updatedTicket,
            user: { // ✅ Added user info
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Error replying to ticket:', error);

        // ✅ Handle authentication errors specifically
        if (error.message.includes('authentication failed')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required to reply to ticket'
                },
                { status: 401 }
            );
        }

        // ✅ Handle invalid ticket ID format
        if (error.name === 'CastError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid ticket ID format'
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: false,
            error: 'Failed to send reply: ' + error.message
        }, { status: 500 });
    }
}