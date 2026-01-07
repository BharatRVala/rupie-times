import { NextResponse } from 'next/server';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import connectDB from '@/app/lib/utils/dbConnect';

export async function POST(request) {
  try {
    console.log('Starting advertisement image upload process...');
    
    // Authenticate admin
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      return NextResponse.json(
        { 
          success: false,
          error: auth.error 
        },
        { status: auth.status }
      );
    }
    
    console.log('Admin authenticated for upload:', auth.email);

    // Connect to database
    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No file provided' 
        }, 
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, GIF, WebP and SVG images are allowed.' 
        }, 
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          success: false,
          error: 'File size too large. Maximum size is 10MB.' 
        }, 
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const db = mongoose.connection.db;
    
    // Use 'advertisements' bucket for advertisement images
    const bucket = new GridFSBucket(db, { bucketName: 'advertisements' });

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalName = file.name.replace(/\s+/g, '-').toLowerCase();
    const filename = `ad-${timestamp}-${randomString}-${originalName}`;

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.type,
      metadata: {
        originalName: file.name,
        uploadedBy: auth.id,
        uploadedByEmail: auth.email,
        uploadDate: new Date(),
        type: 'advertisement'
      }
    });

    const uploadResult = await new Promise((resolve, reject) => {
      uploadStream.end(buffer);
      uploadStream.on('finish', () => {
        resolve({
          filename: filename,
          contentType: file.type,
          size: buffer.length,
          gridfsId: uploadStream.id.toString()
        });
      });
      uploadStream.on('error', reject);
    });

    return NextResponse.json({
      success: true,
      message: 'Advertisement image uploaded successfully',
      data: {
        filename: uploadResult.filename,
        gridfsId: uploadResult.gridfsId,
        contentType: uploadResult.contentType,
        size: uploadResult.size,
        url: `/api/advertisements/image/${uploadResult.filename}`
      }
    });

  } catch (error) {
    console.error('Advertisement upload error:', error);
    
    // Handle authentication errors
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Admin authentication required to upload files' 
        },
        { status: 401 }
      );
    }
    
    // Handle GridFS connection errors
    if (error.message.includes('MongoNotConnectedError') || error.message.includes('connection')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection failed. Please try again.' 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to upload file: ' + error.message 
      }, 
      { status: 500 }
    );
  }
}