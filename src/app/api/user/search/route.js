import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/utils/dbConnect';
import Product from '@/app/lib/models/product';
import FreeArticle from '@/app/lib/models/article';
import Subscription from '@/app/lib/models/Subscription';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request) {
    try {
        await connectDB();

        const auth = authenticateUser(request);
        if (!auth.success) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const userId = auth.id;

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        if (!query.trim()) {
            return NextResponse.json({ success: true, articles: [], products: [] });
        }

        const searchRegex = new RegExp(query, 'i');

        // 1. Fetch User Active Subscriptions - only get product ID
        const activeSubscriptions = await Subscription.find({
            user: userId,
            paymentStatus: 'completed',
            status: { $in: ['active', 'expiresoon'] }
        }).select('product startDate originalStartDate historicalArticleLimit status').lean();

        if (!activeSubscriptions.length) {
            // Only search Free Articles if no subscriptions
            const freeArticles = await FreeArticle.find({
                isActive: true,
                $or: [
                    { mainHeading: searchRegex },
                    { description: searchRegex },
                    { category: searchRegex }
                ]
            }).select('mainHeading description category createdAt featuredImage').limit(20).lean();

            return NextResponse.json({
                success: true,
                products: [],
                articles: freeArticles.map(a => ({
                    id: a._id.toString(),
                    title: a.mainHeading,
                    description: a.description,
                    category: a.category,
                    type: 'free',
                    image: (typeof a.featuredImage === 'string' ? a.featuredImage : a.featuredImage?.filename) ? (typeof a.featuredImage === 'string' ? a.featuredImage : `/api/admin/articles/image/${a.featuredImage.filename}`) : '/placeholder-image.png'
                }))
            });
        }

        // 2. Batch Fetch Unique Products (Exclude heavy sections/blocks)
        const uniqueProductIds = [...new Set(activeSubscriptions.map(sub => sub.product?.toString()).filter(Boolean))];
        const productsFetched = await Product.find({ _id: { $in: uniqueProductIds } })
            .select('-articles.sections') // IMPORTANT: Exclude heavy content for search
            .lean();

        const productsById = new Map(productsFetched.map(p => [p._id.toString(), p]));

        // 3. Process each subscription and its accessible articles
        const matchedProductsMap = new Map();
        const articleResultMap = new Map();

        for (const sub of activeSubscriptions) {
            const productId = sub.product?.toString();
            if (!productId) continue;

            const productData = productsById.get(productId);
            if (!productData) continue;

            // Use the model method logic but on plain object (we need to be careful with lean() vs model instances)
            // Since we can't call model methods on lean objects, we'll implement a lightweight version of getAccessibleArticles here
            const getAccessiblesForSearch = (prod, subStartDate, lookBack = 5) => {
                if (!prod.articles || prod.articles.length === 0) return [];
                const subDate = new Date(subStartDate);
                const active = prod.articles.filter(a => a.isActive && a.createdAt);

                const future = active.filter(a => new Date(a.createdAt) > subDate);
                const historical = active.filter(a => new Date(a.createdAt) <= subDate)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, lookBack);

                return [...historical, ...future].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            };

            const effectiveStartDate = sub.originalStartDate || sub.startDate;
            const lookBackLimit = sub.historicalArticleLimit || 5;
            const accessibleArticles = getAccessiblesForSearch(productData, effectiveStartDate, lookBackLimit);

            // A. Check Product Matches
            if (!matchedProductsMap.has(productId)) {
                if (searchRegex.test(productData.heading) || searchRegex.test(productData.shortDescription)) {
                    matchedProductsMap.set(productId, {
                        id: productId,
                        title: productData.heading,
                        description: productData.shortDescription,
                        category: productData.category,
                        image: productData.filename ? `/api/user/products/image/${productData.filename}` : '/placeholder-image.png',
                        type: 'product',
                        latestArticleId: accessibleArticles.length > 0 ? accessibleArticles[0]._id.toString() : null
                    });
                }
            }

            // B. Check Article Matches
            accessibleArticles.forEach(a => {
                const aId = a._id.toString();
                if (!articleResultMap.has(aId)) {
                    if (searchRegex.test(a.mainHeading) || searchRegex.test(a.description) || searchRegex.test(a.category)) {
                        articleResultMap.set(aId, {
                            id: aId,
                            productId: productId,
                            title: a.mainHeading,
                            description: a.description,
                            category: a.category,
                            type: 'product_article',
                            image: a.image?.filename ? `/api/user/products/${productId}/articles/image/${a.image.filename}` : '/placeholder-image.png',
                            createdAt: a.createdAt
                        });
                    }
                }
            });
        }

        // 4. Search Free Articles
        const freeArticles = await FreeArticle.find({
            isActive: true,
            $or: [
                { mainHeading: searchRegex },
                { description: searchRegex },
                { category: searchRegex }
            ]
        }).select('mainHeading description category createdAt featuredImage').limit(10).lean();

        const formattedFreeArticles = freeArticles.map(a => {
            const aId = a._id.toString();
            if (!articleResultMap.has(aId)) {
                return {
                    id: aId,
                    title: a.mainHeading,
                    description: a.description,
                    category: a.category,
                    type: 'free',
                    image: (typeof a.featuredImage === 'string' ? a.featuredImage : a.featuredImage?.filename) ? (typeof a.featuredImage === 'string' ? a.featuredImage : `/api/admin/articles/image/${a.featuredImage.filename}`) : '/placeholder-image.png',
                    createdAt: a.createdAt
                };
            }
            return null;
        }).filter(Boolean);

        // Combine and limit
        const allMatchedArticles = [
            ...Array.from(articleResultMap.values()),
            ...formattedFreeArticles
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);

        return NextResponse.json({
            success: true,
            products: Array.from(matchedProductsMap.values()),
            articles: allMatchedArticles
        });

    } catch (error) {
        console.error('User search error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
