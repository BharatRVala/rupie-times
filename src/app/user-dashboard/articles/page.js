import ArticleList from "../../rupiesTimeTalk/ArticleList";
import sharpIcon from "../../assets/sharp.svg";

// Reuse the fetch logic but with dashboard specific tweaks if needed
import { getArticlesService } from '@/app/lib/services/articleService';
import { cookies } from 'next/headers';
import { authenticateUser } from '@/app/lib/middleware/auth';

// Reuse the fetch logic but with dashboard specific tweaks if needed
async function getArticles() {
    let user = null;
    try {
        const cookieStore = await cookies();
        const req = { cookies: cookieStore };
        const authResult = authenticateUser(req);
        if (authResult.success) {
            user = authResult;
        }
    } catch (e) {
        // Ignore auth errors
    }

    try {
        const data = await getArticlesService({ limit: 5, user });

        if (data.success && data.articles) {
            return {
                articles: data.articles.map(article => ({
                    id: article._id,
                    title: article.mainHeading,
                    date: new Date(article.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }),
                    rawDate: new Date(article.createdAt).toISOString(),
                    description: article.description,
                    category: article.category,
                    author: article.author || 'Rupie Times',
                    // Use calculated sectionsCount (excludes pure footers)
                    sectionCount: article.sectionsCount ?? article.sections?.length ?? 0,
                    // Update link to point to dashboard view
                    link: `/user-dashboard/articles/${article._id}`,
                    iconSrc: sharpIcon,
                    featuredImage: article.featuredImage,
                    isImportant: article.isImportant,
                    isFavorite: article.isFavorite || false
                })),
                total: data.pagination?.total || 0
            };
        }
        return { articles: [], total: 0 };
    } catch (e) {
        console.error("Failed to fetch articles", e);
        return { articles: [], total: 0 };
    }
}

export default async function DashboardArticlesPage() {
    const { articles, total } = await getArticles();

    return (
        <div className="font-sans text-black min-h-[60vh]">
            <ArticleList
                initialArticles={articles}
                initialTotal={total}
                pageTitle="Dashboard Articles"
                hideAd={true}
                baseLinkPath="/user-dashboard/articles"
            />
        </div>
    );
}
