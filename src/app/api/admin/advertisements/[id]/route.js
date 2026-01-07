import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Advertisement from '@/app/lib/models/Advertisement';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';

export async function PUT(req, { params }) {
  try {
    await connectDB();

    // Authenticate admin
    const auth = authenticateAdmin(req);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Find advertisement
    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
      return NextResponse.json(
        { success: false, message: 'Advertisement not found' },
        { status: 404 }
      );
    }

    // Check if image is being updated
    if (body.imageGridfsId && body.imageGridfsId !== advertisement.imageGridfsId) {
      // Delete old image from GridFS
      try {
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'advertisements' });
        await bucket.delete(new mongoose.Types.ObjectId(advertisement.imageGridfsId));
      } catch (gridfsError) {
        console.error('Error deleting old image from GridFS:', gridfsError);
        // Continue with update even if deletion fails
      }
    }

    // Update allowed fields
    const allowedFields = [
      'name', 'position', 'link', 'title', 'description',
      'width', 'height', 'isActive',
      'imageFilename', 'imageGridfsId', 'imageContentType', 'imageSize'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        advertisement[field] = body[field];
      }
    });

    advertisement.updatedBy = auth.id;
    await advertisement.save();

    // Populate fields for response
    await advertisement.populate('createdBy', 'name email');
    await advertisement.populate('updatedBy', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Advertisement updated successfully',
      data: advertisement
    });

  } catch (error) {
    console.error('Update advertisement error:', error);
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

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    // Authenticate admin
    const auth = authenticateAdmin(req);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;

    // Find advertisement
    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
      return NextResponse.json(
        { success: false, message: 'Advertisement not found' },
        { status: 404 }
      );
    }

    // Delete image from GridFS
    try {
      const db = mongoose.connection.db;
      const bucket = new GridFSBucket(db, { bucketName: 'advertisements' });

      // Delete the image file from GridFS
      await bucket.delete(new mongoose.Types.ObjectId(advertisement.imageGridfsId));
    } catch (gridfsError) {
      console.error('Error deleting image from GridFS:', gridfsError);
      // Continue with advertisement deletion even if image deletion fails
    }

    // Delete advertisement from database
    await Advertisement.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Advertisement and image deleted successfully'
    });

  } catch (error) {
    console.error('Delete advertisement error:', error);
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

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const advertisement = await Advertisement.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!advertisement) {
      return NextResponse.json(
        { success: false, message: 'Advertisement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: advertisement
    });

  } catch (error) {
    console.error('Get advertisement error:', error);
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