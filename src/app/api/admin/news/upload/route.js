import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import mongoose from 'mongoose';
import dbConnect from '@/app/lib/utils/dbConnect';

// Helper to get GridFS bucket
let gfsBucket;
const getGfsBucket = async () => {
    if (gfsBucket) return gfsBucket;
    await dbConnect();
    const conn = mongoose.connection;
    gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });
    return gfsBucket;
};

export async function POST(request) {
    try {
        // Authenticate admin
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
        const contentType = file.type;

        const bucket = await getGfsBucket();

        // Create upload stream
        const uploadStream = bucket.openUploadStream(filename, {
            contentType,
            metadata: {
                originalName: file.name,
                uploadedBy: authResult.id,
                type: 'news_featured'
            }
        });

        // Write buffer to stream
        const streamPromise = new Promise((resolve, reject) => {
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
            uploadStream.end(buffer);
        });

        await streamPromise;

        return NextResponse.json({
            success: true,
            filename: filename,
            contentType: contentType,
            size: buffer.length,
            gridfsId: uploadStream.id
        });

    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ success: false, error: 'File upload failed' }, { status: 500 });
    }
}
