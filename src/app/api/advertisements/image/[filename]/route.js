import { NextResponse } from 'next/server';
import { GridFSBucket, ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/utils/dbConnect';
import sharp from 'sharp';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    
    // Connect to database
    await connectDB();
    
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'advertisements' });

    // Find the file by filename
    const files = await bucket.find({ filename }).toArray();
    if (files.length === 0) {
      return new NextResponse('Advertisement image not found', { status: 404 });
    }

    const file = files[0];
    
    // Check if thumbnail is requested
    const url = new URL(request.url);
    const thumbnail = url.searchParams.get('thumbnail') === 'true';
    
    // Create download stream
    const downloadStream = bucket.openDownloadStream(file._id);

    return new Promise((resolve, reject) => {
      const chunks = [];
      
      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('end', async () => {
        try {
          let buffer = Buffer.concat(chunks);
          let contentType = file.contentType;
          let contentLength = file.length;
          
          // If thumbnail is requested and image is not SVG, resize it
          if (thumbnail && !contentType.includes('svg')) {
            try {
              buffer = await sharp(buffer)
                .resize(200, 150, { // Thumbnail dimensions
                  fit: 'cover',
                  position: 'center'
                })
                .jpeg({ quality: 80 })
                .toBuffer();
              
              contentType = 'image/jpeg';
              contentLength = buffer.length;
            } catch (sharpError) {
              console.error('Error processing thumbnail:', sharpError);
              // Return original image if thumbnail processing fails
            }
          }
          
          resolve(new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Length': contentLength.toString(),
              'Cache-Control': 'public, max-age=31536000',
              'Content-Disposition': `inline; filename="${file.filename}"`
            },
          }));
        } catch (error) {
          reject(new NextResponse('Error processing image', { status: 500 }));
        }
      });

      downloadStream.on('error', (error) => {
        reject(new NextResponse('Error streaming image', { status: 500 }));
      });
    });

  } catch (error) {
    console.error('Advertisement image serve error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}