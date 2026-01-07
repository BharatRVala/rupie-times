// src/app/api/admin/products/[id]/articles/image/[filename]/route.js
import { NextResponse } from 'next/server';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';
import dbConnect from '@/app/lib/utils/dbConnect';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;

    // ✅ No authentication required for viewing images

    // Use your existing dbConnect utility 
    await dbConnect();

    // Get the database connection from mongoose
    const db = mongoose.connection.db;

    // Use 'article' bucket for product articles
    const bucket = new GridFSBucket(db, { bucketName: 'article' });

    // Find the file by filename
    let files = await bucket.find({ filename }).toArray();
    let downloadBucket = bucket;

    // Fallback: Check 'freearticles' bucket if not found in 'article'
    if (files.length === 0) {
      const freeBucket = new GridFSBucket(db, { bucketName: 'freearticles' });
      files = await freeBucket.find({ filename }).toArray();
      if (files.length > 0) {
        downloadBucket = freeBucket;
      }
    }

    if (files.length === 0) {
      return new NextResponse('Article image not found', { status: 404 });
    }

    const file = files[0];

    // Create download stream
    const downloadStream = downloadBucket.openDownloadStream(file._id);

    return new Promise((resolve, reject) => {
      const chunks = [];

      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': file.contentType,
            'Content-Length': file.length.toString(),
            'Cache-Control': 'public, max-age=31536000',
          },
        }));
      });

      downloadStream.on('error', (error) => {
        console.error('Product article image stream error:', error);
        reject(new NextResponse('Error streaming article image', { status: 500 }));
      });
    });

  } catch (error) {
    console.error('Product article image serve error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}