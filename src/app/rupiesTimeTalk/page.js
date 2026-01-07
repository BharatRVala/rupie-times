import ArticleList from "./ArticleList";
import sharpIcon from "../assets/sharp.svg";

export const metadata = {
    title: "Rupie Times Talk",
    description: "Latest market news and updates from Rupie Times Talk.",
};

import { getArticlesService } from '@/app/lib/services/articleService';
import { cookies } from 'next/headers';
import { authenticateUser } from '@/app/lib/middleware/auth';

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
        // Ignore auth errors, treat as guest
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
                    // API now returns resolved name if it was an email
                    author: article.author || 'Rupie Times',
                    sectionCount: article.sections?.length || 0,
                    link: `/rupiesTimeTalk/${article._id}`,
                    iconSrc: sharpIcon,
                    featuredImage: article.featuredImage,
                    isImportant: article.isImportant,
                    isFavorite: article.isFavorite || false,
                    priority: article.priority
                })),
                total: data.pagination?.total || 0
            };
        }
        return { articles: [], total: 0 };
    } catch (e) {
        console.error("Failed to fetch articles:", e);
        return { articles: [], total: 0 };
    }
}

export default async function RupiesTimeTalk() {
    const { articles, total } = await getArticles();

    return (
        <div className="min-h-[60vh]">
            <ArticleList initialArticles={articles} initialTotal={total} />
        </div>
    );
}
