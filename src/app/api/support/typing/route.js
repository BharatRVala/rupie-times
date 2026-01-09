import { NextResponse } from 'next/server';

import { authenticateUser } from '@/app/lib/middleware/auth';

export async function POST(request) {
    try {
        const user = await authenticateUser(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { ticketId, typing } = body;

        if (!ticketId) {
            return NextResponse.json({ success: false, error: 'Ticket ID required' }, { status: 400 });
        }

        // Trigger typing event
        // Channel: ticket-{ticketId}
        // Event: user_typing
        if (global.io) {
            global.io.to(`ticket-${ticketId}`).emit('user_typing', {
                userId: user.id,
                typing: typing
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Socket typing error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
