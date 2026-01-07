import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import SupportTicket from '@/app/lib/models/SupportTicket';
import User from '@/app/lib/models/User'; // Import User model
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import pusher from '@/app/lib/utils/pusher';

export async function GET(request, { params }) {
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

    const ticket = await SupportTicket.findById(id)
      .populate('user', 'name email')
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
      ticket: ticket
    });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch ticket: ' + error.message
    }, { status: 500 });
  }
}

// Admin reply to ticket
export async function POST(request, { params }) {
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
    const { message } = body;
    const attachments = body.attachments || [];

    if (!message && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Message or attachment is required' },
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

    // Check if ticket is open for messaging
    if (ticket.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Cannot send message. Ticket is not open for conversation.' },
        { status: 400 }
      );
    }

    // Add admin message
    const messageData = {
      user: authResult.id, // Updated to use id from authResult
      message: message.trim(),
      isAdmin: true,
      adminName: authResult.name || 'Admin',
      attachments: attachments // ✅ Support attachments
    };

    await ticket.addMessage(messageData);

    // Populate the updated ticket
    const updatedTicket = await SupportTicket.findById(id)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('messages.user', 'name email');

    // Emit Pusher event for real-time message
    try {
      const lastMessage = updatedTicket.messages[updatedTicket.messages.length - 1];
      // Serialize to ensure ObjectIds are strings and structure is clean JSON
      const cleanMessage = JSON.parse(JSON.stringify(lastMessage));

      const eventPayload = {
        ...cleanMessage,
        user: cleanMessage.user || { name: 'Admin', email: authResult.email }
      };

      await pusher.trigger(`ticket-${id}`, 'receive_message', eventPayload);
    } catch (pusherError) {
      console.error('Pusher Trigger Error:', pusherError);
    }

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully',
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Error replying to ticket:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send reply: ' + error.message
    }, { status: 500 });
  }
}

// Assign ticket to admin and open it
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

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Assign to current admin and open the ticket
    await ticket.assignToAdmin(
      authResult.id,
      authResult.name,
      authResult.email
    );

    // Emit Pusher event for real-time update
    try {
      await pusher.trigger(`ticket-${id}`, 'status_changed', 'open');
    } catch (pusherError) {
      console.error('Pusher Trigger Error:', pusherError);
    }

    // Add system message about assignment
    const messageData = {
      user: authResult.id, // Updated to use id from authResult
      message: `Ticket assigned to ${authResult.name} and conversation started`,
      isAdmin: true,
      adminName: 'System'
    };

    await ticket.addMessage(messageData);

    const updatedTicket = await SupportTicket.findById(id)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('messages.user', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Ticket assigned and opened successfully',
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Error assigning ticket:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to assign ticket: ' + error.message
    }, { status: 500 });
  }
}

// Update ticket status (e.g., close ticket)
export async function PATCH(request, { params }) {
  try {
    // Check admin authentication
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['open', 'closed', 'waiting'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status provided' },
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

    // Manually update status and add message to bypass restriction
    ticket.status = status;
    if (status === 'closed') {
      ticket.closedAt = new Date();
    } else if (status === 'open' && !ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
    }

    // Set assignedAdmin if not present
    if (!ticket.assignedAdmin || !ticket.assignedAdmin.name) {
      ticket.assignedAdmin = {
        name: authResult.name,
        email: authResult.email
      };
      ticket.assignedTo = authResult.id;
    }

    // Add system message
    const messageData = {
      user: authResult.id,
      message: `Ticket marked as ${status} by ${authResult.name}`,
      isAdmin: true,
      adminName: 'System'
    };
    ticket.messages.push(messageData);
    ticket.lastMessageAt = new Date();

    await ticket.save();

    // Emit Pusher event for real-time update
    try {
      await pusher.trigger(`ticket-${id}`, 'status_changed', status);
    } catch (pusherError) {
      console.error('Pusher Trigger Error:', pusherError);
    }

    const updatedTicket = await SupportTicket.findById(id)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('messages.user', 'name email');

    return NextResponse.json({
      success: true,
      message: `Ticket status updated to ${status}`,
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