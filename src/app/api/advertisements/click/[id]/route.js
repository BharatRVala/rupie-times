
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Advertisement from '@/app/lib/models/Advertisement';
import { authenticateUser, authenticateAdmin } from '@/app/lib/middleware/auth';

export async function POST(req, { params }) {
    try {
        await connectDB();

        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { success: false, message: 'Advertisement ID is required' },
                { status: 400 }
            );
        }

        // Try to authenticate user or admin
        let auth = authenticateUser(req);
        if (!auth.success) {
            auth = authenticateAdmin(req);
        }

        let userId = auth.success ? auth.id : null;

        if (userId) {
            // Authenticated user: Check uniqueness
            // We use findOneAndUpdate with condition that user is NOT in clickedBy
            const advertisement = await Advertisement.findOneAndUpdate(
                { _id: id, clickedBy: { $ne: userId } },
                {
                    $addToSet: { clickedBy: userId },
                    $inc: { clicks: 1 }
                },
                { new: true }
            );

            // If advertisement is null, either it doesn't exist OR user already clicked
            if (!advertisement) {
                // Check if it exists at all
                const adExists = await Advertisement.findById(id);
                if (!adExists) {
                    return NextResponse.json({ success: false, message: 'Advertisement not found' }, { status: 404 });
                }
                // Exists -> User already clicked. Return success but don't count.
                return NextResponse.json({ success: true, message: 'Click already tracked for user' });
            }

            return NextResponse.json({ success: true, message: 'Click tracked successfully (Unique)' });

        } else {
            // Guest user: Just increment (since we cannot track uniqueness reliably)
            const advertisement = await Advertisement.findByIdAndUpdate(
                id,
                { $inc: { clicks: 1 } },
                { new: true }
            );

            if (!advertisement) {
                return NextResponse.json({ success: false, message: 'Advertisement not found' }, { status: 404 });
            }

            return NextResponse.json({ success: true, message: 'Click tracked successfully (Guest)' });
        }

    } catch (error) {
        console.error('Track click error:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Server error',
                error: error.message
            },
            { status: 500 }
        );
    }
}
