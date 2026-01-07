import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import SupportTicket from '@/app/lib/models/SupportTicket';
import User from '@/app/lib/models/User'; // Import User model
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function PUT(request, { params }) {
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

    // FIX: Await the params
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['waiting', 'open', 'closed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Update status
    await ticket.updateStatus(status);

    // Auto-assign to current admin if opening and not assigned
    if (status === 'open' && !ticket.assignedTo) {
      ticket.assignedTo = authResult.id;
      await ticket.save();
    }

    // Add system message about status change
    const messageData = {
      user: authResult.id, // Updated to use id from authResult
      message: `Ticket status changed to ${status}`,
      isAdmin: true,
      adminName: authResult.name || 'System' // Use real name if possible
    };

    // Only add message if ticket is open (can't add messages to closed/waiting tickets)
    if (ticket.status === 'open') {
      await ticket.addMessage(messageData);
    }

    // Populate the updated ticket
    const updatedTicket = await SupportTicket.findById(id)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('messages.user', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Ticket status updated successfully',
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Error updating ticket status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update ticket status: ' + error.message
    }, { status: 500 });
  }
}