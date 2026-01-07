// src/app/api/user/support/create/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import SupportTicket from '@/app/lib/models/SupportTicket';
import User from '@/app/lib/models/User';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function POST(request) {
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

        const body = await request.json();
        const { subject, message, category = 'general', priority = 'medium' } = body;

        // Validate required fields
        if (!subject || !message) {
            return NextResponse.json(
                { success: false, error: 'Subject and message are required' },
                { status: 400 }
            );
        }

        // Create support ticket
        const ticketData = {
            user: user.id,
            name: user.name || 'User',
            email: user.email,
            subject: subject.trim(),
            initialMessage: message.trim(),
            category,
            priority,
            status: 'waiting', // Default status is waiting
            ticketNumber: `TKT-TEMP-${Date.now()}`
        };

        const ticket = new SupportTicket(ticketData);
        await ticket.save();

        // If ticketNumber is still the temp one, regenerate it
        if (ticket.ticketNumber.includes('TEMP')) {
            ticket.ticketNumber = `TKT-${ticket._id.toString().slice(-6).toUpperCase()}`;
            await ticket.save();
        }

        // Populate user data for response
        await ticket.populate('user', 'name email');

        return NextResponse.json({
            success: true,
            message: 'Support ticket created successfully',
            ticket: {
                id: ticket._id,
                ticketNumber: ticket.ticketNumber,
                subject: ticket.subject,
                category: ticket.category,
                priority: ticket.priority,
                status: ticket.status,
                createdAt: ticket.createdAt
            },
            user: { // ✅ Added user info
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Error creating support ticket:', error);

        // ✅ Handle authentication errors specifically
        if (error.message.includes('authentication failed')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required to create support ticket'
                },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: false,
            error: 'Failed to create support ticket: ' + error.message
        }, { status: 500 });
    }
}