import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/app/lib/models/product';
import User from '@/app/lib/models/User'; // For author names
import dbConnect from '@/app/lib/utils/dbConnect';

export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid product ID' },
                { status: 400 }
            );
        }

        // Fetch Product Basic Info
        const productBasic = await Product.findById(id)
            .select('heading shortDescription isActive articles variants')
            .lean();

        if (!productBasic) {
            return NextResponse.json(
                { success: false, error: 'Product not found' },
                { status: 404 }
            );
        }

        // Get URL params for pagination (optional, but good for ArticleList)
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 100; // Default to 100 for preview
        const skip = (page - 1) * limit;

        // Aggregation to fetch and sort articles
        // We want ALL active articles for preview
        const productIdObj = new mongoose.Types.ObjectId(id);

        const pipeline = [
            { $match: { _id: productIdObj } },
            { $unwind: '$articles' },
            { $match: { 'articles.isActive': true } }, // Only active ones? Or all? User said "Live Preview", so probably active only.
            { $sort: { 'articles.createdAt': -1 } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            }
        ];

        const aggregationResult = await Product.aggregate(pipeline);
        const result = aggregationResult[0];
        const rawArticles = result.data.map(item => item.articles);
        const total = result.metadata[0] ? result.metadata[0].total : 0;

        // Fetch Authors
        let authorMap = new Map();
        const uniqueAuthors = [...new Set(rawArticles.map(a => a.author).filter(a => a && a.includes('@')))];
        if (uniqueAuthors.length > 0) {
            const users = await User.find({ email: { $in: uniqueAuthors } }).select('email name');
            users.forEach(u => authorMap.set(u.email, u.name));
        }

        // Format Articles
        const formattedArticles = rawArticles.map(article => {
            let displayAuthor = article.author;
            if (article.author && article.author.includes('@')) {
                displayAuthor = authorMap.get(article.author) || article.author;
            }

            return {
                _id: article._id.toString(),
                mainHeading: article.mainHeading,
                description: article.description,
                author: displayAuthor,
                category: article.category,
                image: article.image, // ArticleList uses 'featuredImage' or 'image'? Mapped in ArticleList: featuredImage: article.featuredImage. 
                // Wait, ArticleList map: 
                // featuredImage: article.featuredImage
                // iconSrc: sharpIcon
                // But the user API returns 'image'. 
                // In ArticleList.jsx: `featuredImage: article.featuredImage`
                // In User API: `image: article.image`
                // I should probably map `featuredImage` to `article.image` in the response to match ArticleList expectation?
                // Actually ArticleList *maps* the API response.
                // `src/app/rupiesTimeTalk/ArticleList.jsx`:
                // const mappedArticles = data.articles.map(article => ({ ... featuredImage: article.featuredImage ... }))
                // So the API should return `featuredImage` OR `ArticleList` should use `image`.
                // The User API returns `image`. `ArticleList` uses `featuredImage`. 
                // Let's look at `OuterArticleCard`. It uses `featuredImage`.
                // If User API returns `image` and ArticleList maps `featuredImage: article.featuredImage`, then `featuredImage` will be undefined if the API sends `image`.
                // I should stick to what `src/app/api/user/products/[id]/articles/route.js` returns.
                // It returns `image: article.image`.
                // So `ArticleList` might be broken for this field if it expects `featuredImage`?
                // Let's check `ArticleList.jsx` again in Step 676.
                // Line 97: `featuredImage: article.featuredImage,`
                // So `ArticleList` *expects* the API to return `featuredImage`.
                // But `User API` returns `image`.
                // Does `ArticleList` working currently?
                // Maybe `article.featuredImage` exists in the `articles` array from DB directly?
                // In `Product` model, the subdocument has `image`.
                // So it seems `ArticleList` might be using `featuredImage` property which might be missing.
                // However, I will map it to `featuredImage` here to be safe for `ArticleList`.
                featuredImage: article.image,

                createdAt: article.createdAt,
                updatedAt: article.updatedAt,
                sections: article.sections, // For count
                isImportant: article.isImportant,
                priority: article.priority
            };
        });

        return NextResponse.json({
            success: true,
            product: {
                id: productBasic._id.toString(),
                heading: productBasic.heading,
                shortDescription: productBasic.shortDescription
            },
            articles: formattedArticles,
            pagination: {
                total: total,
                page: page,
                limit: limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error in preview API:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch preview' },
            { status: 500 }
        );
    }
}
