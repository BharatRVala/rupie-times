import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Subscription from '@/app/lib/models/Subscription';
import Product, { ProductReadingProgress } from '@/app/lib/models/product';
import FreeArticle, { ReadingProgress } from '@/app/lib/models/article';
import connectDB from '@/app/lib/utils/dbConnect';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request) {
    try {
        await connectDB();
        const authResult = authenticateUser(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const userId = authResult.id;

        // --- Part 1: Subscription Articles ---
        let subTotalArticles = 0;
        let subCompletedArticles = 0;

        // 1.1 Get all active subscriptions
        // We need 'product', 'startDate', 'originalStartDate', 'contiguousChainId', 'historicalArticleLimit'
        const activeSubscriptions = await Subscription.find({
            user: userId,
            status: { $in: ['active', 'expiresoon'] },
            endDate: { $gt: new Date() }
        }).lean();

        if (activeSubscriptions.length > 0) {
            // Optimization: Batch Fetching to avoid N+1 queries
            const productIds = activeSubscriptions.map(sub => sub.product);

            // 1. Fetch all related products in one go (lean)
            const products = await Product.find({ _id: { $in: productIds } })
                .select('articles.isActive articles.createdAt articles._id articles.sections._id')
                .lean();

            const productsMap = new Map(products.map(p => [p._id.toString(), p]));

            // 2. Fetch all reading progress for these products in one go
            const allProgress = await ProductReadingProgress.find({
                userId: userId,
                productId: { $in: productIds }
            }).lean();

            // Map: productId -> articleId -> progressDoc
            const progressMap = new Map();
            allProgress.forEach(prog => {
                const key = `${prog.productId.toString()}_${prog.articleId.toString()}`;
                progressMap.set(key, prog);
            });

            // 3. Pre-process product articles (Filter & Sort ONCE per product)
            const productArticlesMap = new Map();
            products.forEach(p => {
                const valid = (p.articles || [])
                    .filter(a => a.isActive && a.createdAt)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first
                productArticlesMap.set(p._id.toString(), valid);
            });

            // 4. Process Subscriptions
            for (const sub of activeSubscriptions) {
                const productIdStr = sub.product.toString();
                const allArticles = productArticlesMap.get(productIdStr);

                if (!allArticles) continue;

                let effectiveStartDate = sub.startDate;
                if (sub.originalStartDate) {
                    effectiveStartDate = sub.originalStartDate;
                }
                const startDateObj = new Date(effectiveStartDate);
                const historicalArticleLimit = sub.historicalArticleLimit || 5;

                // Split into Future and Historical optimized
                // Since allArticles is sorted Newest First:
                // Future articles are those with date > startDate
                // Historical are date <= startDate

                const accessibleArticles = [];
                let historicalCount = 0;

                for (const article of allArticles) {
                    const aDate = new Date(article.createdAt);
                    if (aDate > startDateObj) {
                        accessibleArticles.push(article);
                    } else {
                        // Historical
                        if (historicalCount < historicalArticleLimit) {
                            accessibleArticles.push(article);
                            historicalCount++;
                        }
                        // Since sorted, once we hit historical limit, we can't find any more *future* articles (impossible) 
                        // or "better" historical ones (we want the *latest* N historical, which are the ones we just saw).
                        // So we can stop if we just want accessible ones.
                        // Wait, future articles come *before* historical in "Newest First" sort?
                        // Yes. Future > StartDate. Historical <= StartDate.
                        // So Future articles appear first in the list.
                        // Once we hit a date <= StartDate, we are in Historical territory.
                        // So correct: take all Future, then take first N Historical, then STOP.
                        // COMPLETE OPTIMIZATION:
                        if (historicalCount >= historicalArticleLimit) break;
                    }
                }

                subTotalArticles += accessibleArticles.length;

                // Check completion
                for (const article of accessibleArticles) {
                    const progKey = `${productIdStr}_${article._id.toString()}`;
                    const prog = progressMap.get(progKey);

                    if (prog && prog.completed) {
                        subCompletedArticles++;
                    } else if (prog && prog.readSections && article.sections) {
                        // Fallback: check section counts if not marked completed
                        // FIX: Exclude pure footer sections from count
                        const isPureFooterSection = (section) => {
                            if (!section.contentBlocks || section.contentBlocks.length === 0) return false;
                            return section.contentBlocks.every(b => b.blockType === 'footer' || b.type === 'footer');
                        };

                        const totalValidSections = article.sections.filter(s => !isPureFooterSection(s)).length;

                        // We also need to count only valid read sections (non-footers)
                        // But since we can't easily filter readSections here without fetching logic (readSections has ids),
                        // and we assume the frontend won't mark footers as read anymore...
                        // We should ideally cross-reference.

                        // Let's count how many *valid* sections have indeed been read
                        const readValidSectionsCount = prog.readSections.filter(rs => {
                            const section = article.sections.find(s => s._id.toString() === rs.sectionId.toString());
                            return section && !isPureFooterSection(section);
                        }).length;

                        if (totalValidSections > 0 && readValidSectionsCount >= totalValidSections) {
                            subCompletedArticles++;
                        }
                    }
                }
            }
        }

        // --- Part 1.5: Trial Articles (NEW) ---
        let trialTotal = 0;
        let trialCompleted = 0;

        // Fetch user to check trial status
        const User = (await import('@/app/lib/models/User')).default;
        const user = await User.findById(userId);

        const trial = user?.trial || { isUsed: false };
        let isTrialActive = false;

        // Use stored endDate for validation
        if (trial.isUsed && trial.startDate) {
            const now = new Date();
            const end = trial.endDate ? new Date(trial.endDate) : new Date(new Date(trial.startDate).getTime() + (7 * 24 * 60 * 60 * 1000));
            if (now < end) isTrialActive = true;
        }

        if (isTrialActive) {
            // Get IDs of subscribed products to avoid double counting
            const subscribedProductIds = activeSubscriptions.map(s => s.product.toString());

            // Fetch products with free trial articles
            const trialProducts = await Product.find({
                "articles.isFreeTrial": true,
                isActive: true,
                _id: { $nin: subscribedProductIds } // Exclude subscribed products
            }).select('_id articles.isFreeTrial articles.isActive articles._id articles.sections._id').lean();

            const trialProductIds = trialProducts.map(p => p._id);

            // Fetch progress for these trial products
            const trialProgress = await ProductReadingProgress.find({
                userId: userId,
                productId: { $in: trialProductIds }
            }).lean();

            const trialProgressMap = new Map();
            trialProgress.forEach(prog => {
                const key = `${prog.productId.toString()}_${prog.articleId.toString()}`;
                trialProgressMap.set(key, prog);
            });

            for (const prod of trialProducts) {
                // Filter valid trial articles
                const trialArticles = (prod.articles || []).filter(a => a.isFreeTrial && a.isActive);
                trialTotal += trialArticles.length;

                for (const article of trialArticles) {
                    const progKey = `${prod._id.toString()}_${article._id.toString()}`;
                    const prog = trialProgressMap.get(progKey);

                    if (prog && prog.completed) {
                        trialCompleted++;
                    } else if (prog && prog.readSections && article.sections) {
                        // Fallback section count check (same as subscription logic)
                        const isPureFooterSection = (section) => {
                            if (!section.contentBlocks || section.contentBlocks.length === 0) return false;
                            return section.contentBlocks.every(b => b.blockType === 'footer' || b.type === 'footer');
                        };

                        const totalValidSections = article.sections.filter(s => !isPureFooterSection(s)).length;

                        const readValidSectionsCount = prog.readSections.filter(rs => {
                            const section = article.sections.find(s => s._id.toString() === rs.sectionId.toString());
                            return section && !isPureFooterSection(section);
                        }).length;

                        if (totalValidSections > 0 && readValidSectionsCount >= totalValidSections) {
                            trialCompleted++;
                        }
                    }
                }
            }
        }

        // --- Part 2: Free Articles ---
        // 2.1 Count Total Active Free Articles
        const freeTotalArticles = await FreeArticle.countDocuments({
            isActive: true,
            accessType: { $in: ['withoutlogin', 'login'] }
        });

        // 2.2 Count Completed Free Articles (Optimized)
        // Get active free article IDs
        const activeFreeArticles = await FreeArticle.find({
            isActive: true,
            accessType: { $in: ['withoutlogin', 'login'] }
        }).select('_id').lean();

        const activeFreeArticleIds = activeFreeArticles.map(a => a._id);

        const freeCompletedArticles = await ReadingProgress.countDocuments({
            userId: userId,
            articleId: { $in: activeFreeArticleIds },
            completed: true
        });

        // --- Part 3: Combine ---
        const totalArticles = subTotalArticles + freeTotalArticles + trialTotal;
        const completedArticles = subCompletedArticles + freeCompletedArticles + trialCompleted;

        const percentage = totalArticles > 0
            ? Math.round((completedArticles / totalArticles) * 100)
            : 0;

        return NextResponse.json({
            success: true,
            progress: {
                percentage,
                completedArticles,
                totalArticles,
                details: {
                    subscription: { total: subTotalArticles, completed: subCompletedArticles },
                    free: { total: freeTotalArticles, completed: freeCompletedArticles },
                    trial: { total: trialTotal, completed: trialCompleted }
                }
            }
        });

    } catch (error) {
        console.error('❌ Error calculating learning progress:', error.message);
        console.error(error.stack);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
