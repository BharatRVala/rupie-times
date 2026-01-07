import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import SupportTicket from '@/app/lib/models/SupportTicket';
import { authenticateUser, authenticateAdmin } from '@/app/lib/middleware/auth';

export async function POST(request, { params }) {
    try {
        // 1. Authenticate (User OR Admin)
        let authResult = await authenticateUser(request);

        if (!authResult || !authResult.id) {
            // Fallback to admin auth
            const adminAuth = authenticateAdmin(request);
            if (adminAuth.success) {
                authResult = adminAuth;
            } else {
                return NextResponse.json(
                    { success: false, error: 'Authentication required' },
                    { status: 401 }
                );
            }
        }

        await connectDB();
        const { id } = await params;
        const currentUserId = authResult.id;



        const result = await SupportTicket.updateOne(
            { _id: id },
            {
                $push: {
                    "messages.$[elem].readBy": {
                        user: currentUserId,
                        readAt: new Date()
                    }
                }
            },
            {
                arrayFilters: [
                    {
                        "elem.user": { $ne: currentUserId },
                        "elem.readBy.user": { $ne: currentUserId } // Only update if I haven't read it
                    }
                ]
            }
        );

        return NextResponse.json({
            success: true,
            updatedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to mark read: ' + error.message
        }, { status: 500 });
    }
}
