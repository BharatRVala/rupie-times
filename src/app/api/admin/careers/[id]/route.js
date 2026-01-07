import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import Career from '@/app/lib/models/Career';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

// PUT: Update a career (Admin)
export async function PUT(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status || 401 });
        }

        const { id } = await params;
        await dbConnect();
        const body = await request.json();

        const updatedCareer = await Career.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!updatedCareer) {
            return NextResponse.json({ success: false, message: 'Job Position not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Job Position updated successfully',
            data: updatedCareer
        });

    } catch (error) {
        console.error('Error updating career:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// DELETE: Delete a career (Admin)
export async function DELETE(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status || 401 });
        }

        const { id } = await params;
        await dbConnect();

        const deletedCareer = await Career.findByIdAndDelete(id);

        if (!deletedCareer) {
            return NextResponse.json({ success: false, message: 'Job Position not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Job Position deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting career:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
