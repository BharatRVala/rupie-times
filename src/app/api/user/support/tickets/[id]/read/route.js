import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import SupportTicket from '@/app/lib/models/SupportTicket';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function POST(request, { params }) {
    try {
        const user = authenticateUser(request);

        await connectDB();
        const { id } = await params;

        const ticket = await SupportTicket.findOne({ _id: id, user: user.id });
        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        const userId = user.id;
        let updated = false;

        // Mark all ADMIN messages as read by this User
        ticket.messages.forEach(msg => {
            if (msg.isAdmin) {
                const alreadyRead = msg.readBy.some(rb => rb.user && rb.user.toString() === userId);
                if (!alreadyRead) {
                    msg.readBy.push({
                        user: userId,
                        readAt: new Date()
                    });
                    updated = true;
                }
            }
        });

        if (updated) {
            await ticket.save();
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error marking messages as read:', error);

        if (error.message.includes('authentication failed')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
