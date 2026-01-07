
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import dbConnect from '@/app/lib/utils/dbConnect';

// Define minimal schema if not already globally defined
const getProductArticleModel = () => {
    if (mongoose.models.ProductArticle) return mongoose.models.ProductArticle;
    const articleSchema = new mongoose.Schema({
        mainHeading: String,
        featuredImage: Object
    }, { strict: false, collection: 'productarticles' });
    return mongoose.model('ProductArticle', articleSchema);
};

export async function GET(request, { params }) {
    try {
        const { heading } = await params;
        const decodedHeading = decodeURIComponent(heading);

        await dbConnect();
        const db = mongoose.connection.db;
        const ProductArticle = getProductArticleModel();

        const article = await ProductArticle.findOne({ mainHeading: decodedHeading });

        if (!article) {
            return NextResponse.json({ success: false, message: `Article "${decodedHeading}" not found` }, { status: 404 });
        }

        const debugInfo = {
            articleFound: true,
            id: article._id,
            mainHeading: article.mainHeading,
            featuredImage: article.featuredImage,
            buckets: {}
        };

        if (article.featuredImage && article.featuredImage.filename) {
            const filename = article.featuredImage.filename;

            // Check 'article' bucket
            const bucket = new GridFSBucket(db, { bucketName: 'article' });
            const files = await bucket.find({ filename }).toArray();
            debugInfo.buckets.article = {
                count: files.length,
                files: files
            };

            // Check 'freearticles' bucket
            const freeBucket = new GridFSBucket(db, { bucketName: 'freearticles' });
            const freeFiles = await freeBucket.find({ filename }).toArray();
            debugInfo.buckets.freearticles = {
                count: freeFiles.length,
                files: freeFiles
            };
        }

        return NextResponse.json({ success: true, debug: debugInfo });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
    }
}
