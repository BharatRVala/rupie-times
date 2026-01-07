import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import SupportTicket from '@/app/lib/models/SupportTicket';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function POST(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();
        const { id } = await params;

        const ticket = await SupportTicket.findById(id);
        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        const adminId = authResult.id;
        let updated = false;

        // Mark all USER messages as read by this Admin
        ticket.messages.forEach(msg => {
            if (!msg.isAdmin) {
                const alreadyRead = msg.readBy.some(rb => rb.user && rb.user.toString() === adminId);
                if (!alreadyRead) {
                    msg.readBy.push({
                        user: adminId,
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
