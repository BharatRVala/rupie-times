import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import User from '@/app/lib/models/User';
import Product from '@/app/lib/models/product';
import FreeArticle from '@/app/lib/models/article';
import { authenticateUser } from '@/app/lib/middleware/auth';
import mongoose from 'mongoose';

export async function GET(request) {
    try {
        // 1. Authenticate
        const authResult = authenticateUser(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();

        // 2. Fetch User with Favorites Populated
        // We need to populate:
        // - favorites.articles.productId (Product details)
        // - favorites.freeArticles.articleId (FreeArticle details)

        // favorites.articles usually stores { productId, articleId }.
        // We populate 'productId' to get the Product document. 
        // inside the Product document, we have 'articles' array. We need to find the specific 'articleId'.

        const user = await User.findById(authResult.id)
            .select('favorites')
            .populate({
                path: 'favorites.articles.productId',
                // EXCLUDE articles.sections to prevent loading massive content content
                select: 'heading category articles.mainHeading articles.description articles.author articles.category articles.createdAt articles._id articles.isActive'
            })
            .populate({
                path: 'favorites.freeArticles.articleId',
                // EXCLUDE sections to strictly limit payload size
                select: 'mainHeading description author category createdAt'
            })
            .lean();

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // 3. Process Premium Articles (Find the specific subdocument)
        const processedArticles = (user.favorites?.articles || []).map(fav => {
            if (!fav.productId || !fav.productId.articles) return null;

            const product = fav.productId;
            const article = product.articles.find(a => a._id.toString() === fav.articleId.toString());

            if (!article) return null;

            return {
                _id: fav._id, // The ID of the favorite entry
                productId: product._id,
                articleId: article._id,
                articleHeading: article.mainHeading,
                articleDescription: article.description,
                category: product.category, // Use product category or article category if available
                author: article.author,
                addedAt: fav.addedAt,
                totalSections: article.sections ? article.sections.length : 0,
                createdAt: article.createdAt
            };
        }).filter(item => item !== null);

        // 4. Process Free Articles
        // They are already populated directly
        const processedFreeArticles = (user.favorites?.freeArticles || []).map(fav => {
            if (!fav.articleId) return null;
            return fav; // Return the whole populated object structure as expected by frontend
        }).filter(item => item !== null);

        return NextResponse.json({
            success: true,
            favorites: {
                articles: processedArticles,
                freeArticles: processedFreeArticles
            }
        });

    } catch (error) {
        console.error('Error fetching favorites:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch favorites' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const authResult = authenticateUser(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const userId = authResult.id;

        await connectDB();

        if (type === 'article') {
            const productId = searchParams.get('productId');
            const articleId = searchParams.get('articleId');

            if (!productId || !articleId) {
                return NextResponse.json({ success: false, error: 'Product ID and Article ID required' }, { status: 400 });
            }

            await User.findByIdAndUpdate(userId, {
                $pull: {
                    'favorites.articles': {
                        productId: new mongoose.Types.ObjectId(productId),
                        articleId: new mongoose.Types.ObjectId(articleId)
                    }
                }
            });

        } else if (type === 'freeArticle') {
            const freeArticleId = searchParams.get('freeArticleId');

            if (!freeArticleId) {
                return NextResponse.json({ success: false, error: 'Free Article ID required' }, { status: 400 });
            }

            await User.findByIdAndUpdate(userId, {
                $pull: {
                    'favorites.freeArticles': {
                        articleId: new mongoose.Types.ObjectId(freeArticleId)
                    }
                }
            });

        } else {
            return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Removed from favorites' });

    } catch (error) {
        console.error('Error removing favorite:', error);
        return NextResponse.json({ success: false, error: 'Failed to remove favorite' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authResult = authenticateUser(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { type, productId, articleId, freeArticleId } = body;
        const userId = authResult.id;

        await connectDB();

        if (type === 'article') {
            if (!productId || !articleId) {
                return NextResponse.json({ success: false, error: 'Product ID and Article ID required' }, { status: 400 });
            }

            // Using updateOne with specific filter to prevent duplicates by ID (ignoring addedAt)
            await User.updateOne(
                {
                    _id: userId,
                    'favorites.articles': {
                        $not: {
                            $elemMatch: {
                                productId: new mongoose.Types.ObjectId(productId),
                                articleId: new mongoose.Types.ObjectId(articleId)
                            }
                        }
                    }
                },
                {
                    $push: {
                        'favorites.articles': {
                            productId: new mongoose.Types.ObjectId(productId),
                            articleId: new mongoose.Types.ObjectId(articleId),
                            addedAt: new Date()
                        }
                    }
                }
            );

        } else if (type === 'freeArticle') {
            const idToAdd = freeArticleId || articleId;

            if (!idToAdd) {
                return NextResponse.json({ success: false, error: 'Free Article ID required' }, { status: 400 });
            }

            // Using updateOne with specific filter to prevent duplicates by ID (ignoring addedAt)
            await User.updateOne(
                {
                    _id: userId,
                    'favorites.freeArticles.articleId': { $ne: new mongoose.Types.ObjectId(idToAdd) }
                },
                {
                    $push: {
                        'favorites.freeArticles': {
                            articleId: new mongoose.Types.ObjectId(idToAdd),
                            addedAt: new Date()
                        }
                    }
                }
            );
        } else {
            return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Added to favorites' });

    } catch (error) {
        console.error('Error adding favorite:', error);
        return NextResponse.json({ success: false, error: 'Failed to add favorite' }, { status: 500 });
    }
}