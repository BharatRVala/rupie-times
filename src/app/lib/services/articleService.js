import FreeArticle, { ReadingProgress } from '@/app/lib/models/article';
import User from '@/app/lib/models/User';
import Admin from '@/app/lib/models/Admin';
import dbConnect from '@/app/lib/utils/dbConnect';
import mongoose from 'mongoose';

export async function getArticlesService({
    page = 1,
    limit = 10,
    search = '',
    category = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    user = null
}) {
    await dbConnect();

    // Build query for active articles
    const query = { isActive: true };

    // Apply search filter
    if (search) {
        query.$or = [
            { mainHeading: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } }
        ];
    }

    // Apply category filter
    if (category) {
        query.category = category;
    }

    // Apply access control
    if (user) {
        query.accessType = { $in: ['withoutlogin', 'login'] };
    } else {
        query.accessType = 'withoutlogin';
    }

    // Sort configuration
    const sortConfig = {};
    if (sortBy === 'oldest') {
        sortConfig.createdAt = 1;
    } else {
        // Default: Newest first
        sortConfig.createdAt = -1;
    }

    if (sortBy === 'mainHeading') {
        sortConfig.mainHeading = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'createdAt') {
        sortConfig.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    // Get total count
    const total = await FreeArticle.countDocuments(query);

    // Get articles
    const articles = await FreeArticle.find(query)
        .sort(sortConfig)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('mainHeading description category author createdAt accessType featuredImage sections._id sections.contentBlocks.blockType')
        .lean();

    // Helper to count valid sections (excluding footer-only sections)
    const countValidSections = (sections) => {
        if (!sections) return 0;
        return sections.filter(section => {
            // Only exclude section if it has blocks AND ALL blocks are footers
            // (i.e. a dedicated footer section)
            if (section.contentBlocks && section.contentBlocks.length > 0) {
                const allFooters = section.contentBlocks.every(b => b.blockType === 'footer');
                if (allFooters) return false;
            }
            return true;
        }).length;
    };

    // Get reading progress for all articles for logged-in users
    let articlesWithProgress = articles;
    if (user && user.id) {
        const articleIds = articles.map(article => article._id);
        const readingProgresses = await ReadingProgress.find({
            userId: user.id,
            articleId: { $in: articleIds }
        }).lean();

        // Create a map for quick lookup
        const progressMap = new Map();
        readingProgresses.forEach(progress => {
            progressMap.set(progress.articleId.toString(), progress);
        });

        // Add progress information with dynamic calculation
        articlesWithProgress = articles.map(article => {
            const progress = progressMap.get(article._id.toString());
            // UPDATED: Use filtered count
            const totalSections = countValidSections(article.sections);

            let readPercentage = 0;
            let completed = false;
            let readSectionsCount = 0;
            let progressText = `0/${totalSections}`;

            if (progress) {
                // Filter valid read sections against current article sections
                const validReadSections = progress.readSections.filter(readSection =>
                    article.sections.some(currentSection =>
                        currentSection._id.toString() === readSection.sectionId.toString()
                    )
                );

                // We also need to filter out readSections that correspond to footer-only sections
                const validNonFooterReadSections = validReadSections.filter(rs => {
                    const section = article.sections.find(s => s._id.toString() === rs.sectionId.toString());
                    // If section exists, verify it is NOT a pure footer section
                    if (section && section.contentBlocks && section.contentBlocks.length > 0) {
                        const allFooters = section.contentBlocks.every(b => b.blockType === 'footer');
                        if (allFooters) return false; // Exclude pure footer section
                    }
                    return true;
                });

                readSectionsCount = validNonFooterReadSections.length;

                // Calculate Percentage
                if (totalSections > 0) {
                    readPercentage = Math.round((readSectionsCount / totalSections) * 100);
                    // Cap at 100%
                    readPercentage = Math.min(100, readPercentage);
                }

                // Dynamic Completed Status check
                completed = (readSectionsCount >= totalSections) && (totalSections > 0);
                progressText = `${readSectionsCount}/${totalSections}`;
            }

            return {
                ...article,
                sectionsCount: totalSections,
                readingProgress: {
                    readPercentage,
                    completed,
                    readSectionsCount,
                    totalSections,
                    progressText,
                    hasProgress: !!progress
                }
            };
        });

        // Fetch User Favorites
        const userData = await User.findById(user.id).select('favorites.freeArticles');
        const favoritedArticleIds = new Set(
            userData?.favorites?.freeArticles?.map(fav => fav.articleId?.toString()) || []
        );

        // Add favorite status to response
        articlesWithProgress = articlesWithProgress.map(article => ({
            ...article,
            isFavorite: favoritedArticleIds.has(article._id.toString())
        }));

    } else {
        // For non-logged-in users
        articlesWithProgress = articles.map(article => {
            const totalSections = countValidSections(article.sections);
            return {
                ...article,
                sectionsCount: totalSections,
                isFavorite: false,
                readingProgress: {
                    readPercentage: 0,
                    completed: false,
                    readSectionsCount: 0,
                    totalSections: totalSections,
                    progressText: `0/${totalSections}`,
                    hasProgress: false
                }
            };
        });
    }

    // Get unique categories
    const categories = await FreeArticle.distinct('category', {
        isActive: true,
        accessType: user ? { $in: ['withoutlogin', 'login'] } : 'withoutlogin'
    });

    // Resolve Author Names (if emails)
    const authorEmails = [...new Set(
        articlesWithProgress
            .map(a => a.author)
            .filter(author => author && author.includes('@'))
    )];

    const authorMap = new Map();
    if (authorEmails.length > 0) {
        try {
            const admins = await Admin.find({ email: { $in: authorEmails } }).select('email name');
            admins.forEach(a => authorMap.set(a.email, a.name));
        } catch (err) {
            console.error('Error resolving author names:', err);
        }
    }

    const resolvedArticles = articlesWithProgress.map(article => {
        let displayAuthor = article.author;
        if (displayAuthor && displayAuthor.includes('@')) {
            displayAuthor = authorMap.get(displayAuthor) || displayAuthor;
        }
        return {
            ...article,
            author: displayAuthor,
            _id: article._id.toString(),
        };
    });

    return {
        success: true,
        articles: resolvedArticles,
        userInfo: user ? {
            isLoggedIn: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        } : {
            isLoggedIn: false
        },
        categories: categories.sort(),
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
}

export async function getArticleByIdService({ id, user = null, mode = 'full' }) {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return { success: false, error: 'Invalid article ID', status: 400 };
    }

    // Parallel Fetching: Article + User Data (if logged in)
    let articleQuery = FreeArticle.findById(id).lean();

    if (mode === 'light') {
        // Exclude heavy content blocks for fast initial load
        articleQuery = articleQuery.select('-sections.contentBlocks');
    }

    const articlePromise = articleQuery;

    let userPromise = Promise.resolve(null);
    let progressPromise = Promise.resolve(null);

    if (user && user.id) {
        userPromise = User.findById(user.id).select('favorites.freeArticles favorites.freeArticleSections').lean();
        progressPromise = ReadingProgress.getUserProgress(user.id, id);
    }

    const [article, userData, dbProgress] = await Promise.all([articlePromise, userPromise, progressPromise]);



    if (!article || !article.isActive) {

        return { success: false, error: 'Article not found or unavailable', status: 404 };
    }

    // Access permissions
    if (article.accessType === 'login' && (!user || !user.id)) {
        return {
            success: false,
            error: 'Authentication required',
            requiresLogin: true,
            status: 403
        };
    }

    // Process Favorites
    let favoritedArticleIds = new Set();
    let favoritedSectionIds = new Set();

    if (userData) {
        favoritedArticleIds = new Set(
            userData.favorites?.freeArticles?.map(fav => fav.articleId?.toString()) || []
        );
        favoritedSectionIds = new Set(
            userData.favorites?.freeArticleSections?.map(fav => fav.sectionId.toString()) || []
        );
    }

    // Process Reading Progress
    let processedProgress = null;
    if (user && user.id) {
        if (dbProgress) {
            // Calculate progress using method (needs full document usually, but logic seems robust)
            // Wait, calculateProgress is a method on the DOCUMENT. dbProgress IS a document here (getUserProgress returns doc).
            // However, we need to pass the article object.
            const progressData = dbProgress.calculateProgress(article);

            processedProgress = {
                readSections: dbProgress.readSections,
                completed: progressData.completed,
                readPercentage: progressData.readPercentage,
                totalReadingTime: dbProgress.totalReadingTime,
                lastReadAt: dbProgress.lastReadAt,
                readSectionsCount: progressData.readSectionsCount,
                totalSections: progressData.totalSections,
                progressText: progressData.progressText
            };

            // Save if completion status changed (method modifies `this`)
            if (dbProgress.isModified()) {
                await dbProgress.save();
            }

        } else {
            // No progress yet
            processedProgress = {
                readSections: [],
                completed: false,
                readPercentage: 0,
                totalReadingTime: 0,
                lastReadAt: null,
                readSectionsCount: 0,
                totalSections: article.sections ? article.sections.length : 0,
                progressText: `0/${article.sections ? article.sections.length : 0}`
            };
        }
    } else {
        // Non-logged in defaults
        processedProgress = {
            readSections: [],
            completed: false,
            readPercentage: 0,
            totalReadingTime: 0,
            lastReadAt: null,
            readSectionsCount: 0,
            totalSections: article.sections ? article.sections.length : 0,
            progressText: `0/${article.sections ? article.sections.length : 0}`
        };
    }

    // Resolve Author Name if email
    let displayAuthor = article.author;
    if (displayAuthor && displayAuthor.includes('@')) {
        try {
            const adminAuthor = await Admin.findOne({ email: displayAuthor }).select('name').lean();
            if (adminAuthor) {
                displayAuthor = adminAuthor.name;
            }
        } catch (err) {
            console.warn('Error resolving author name:', err);
        }
    }

    // Process sections to include favorite status
    const processedSections = (article.sections || []).map(section => ({
        ...section,
        _id: section._id.toString(),
        isFavorite: favoritedSectionIds.has(section._id.toString()),
        contentBlocks: (section.contentBlocks || []).map(block => ({
            ...block,
            _id: block._id ? block._id.toString() : undefined
        }))
    }));

    // Update article object with favorites & calculated fields
    const processedArticle = {
        ...article,
        _id: article._id.toString(),
        author: displayAuthor,
        totalSections: article.sections ? article.sections.length : 0,
        isFavorite: favoritedArticleIds.has(article._id.toString()),
        sections: processedSections,
        formattedDate: new Date(article.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        })
    };

    // Deep serialization helper to ensure no Mongoose objects leak
    const serialize = (obj) => JSON.parse(JSON.stringify(obj));

    return {
        success: true,
        article: serialize(processedArticle),
        userInfo: user ? {
            isLoggedIn: true,
            user: { id: user.id, name: user.name, email: user.email }
        } : { isLoggedIn: false },
        readingProgress: serialize(processedProgress),
        accessInfo: {
            accessType: article.accessType,
            canAccess: true,
            message: article.accessType === 'login' ? 'Member-only article' : 'Public article'
        }
    };
}
