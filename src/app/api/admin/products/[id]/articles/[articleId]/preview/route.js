import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product, { ProductReadingProgress } from '@/app/lib/models/product';
import User from '@/app/lib/models/User';
import dbConnect from '@/app/lib/utils/dbConnect';

export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id, articleId } = await params;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(articleId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid IDs' },
                { status: 400 }
            );
        }

        // Fetch Product with the specific article
        // We start with finding the product to ensure context
        const product = await Product.findOne({
            _id: id,
            'articles._id': articleId
        }).select('heading shortDescription articles.$').lean();

        if (!product || !product.articles || product.articles.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Article not found in this product' },
                { status: 404 }
            );
        }

        const article = product.articles[0];

        // Fetch Author Name if it's an email
        let displayAuthor = article.author;
        if (article.author && article.author.includes('@')) {
            const user = await User.findOne({ email: article.author }).select('name');
            if (user) displayAuthor = user.name;
        }

        // Mock Reading Progress (Empty for Admin Preview)
        const readingProgress = {
            readSections: [],
            completed: false
        };

        // Format Response to match User API structure
        const formattedArticle = {
            _id: article._id.toString(),
            mainHeading: article.mainHeading,
            description: article.description,
            author: displayAuthor,
            category: article.category,
            image: article.image,
            sections: article.sections,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
            isImportant: article.isImportant,
            priority: article.priority
        };

        return NextResponse.json({
            success: true,
            product: {
                id: product._id.toString(),
                heading: product.heading,
                shortDescription: product.shortDescription
            },
            article: formattedArticle,
            readingProgress: readingProgress,
            hasAccess: true // Always true for admin
        });

    } catch (error) {
        console.error('Error in admin single article preview API:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch article preview' },
            { status: 500 }
        );
    }
}
