import React from 'react';
import { notFound } from 'next/navigation';
import ArticleView from './ArticleView';
import { getArticleByIdService } from '@/app/lib/services/articleService';
import { cookies } from 'next/headers';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function generateMetadata({ params }) {
    const { id } = await params;

    try {
        const result = await getArticleByIdService({ id, user: null, mode: 'light' });

        if (!result.success || !result.article) {
            return {
                title: 'Article Not Found',
            };
        }

        const article = result.article;
        return {
            title: `${article.mainHeading} - Rupie Times Talk`,
            description: article.description,
        };
    } catch (error) {
        return {
            title: 'Error Loading Article',
        };
    }
}

export default async function Page({ params }) {
    const { id } = await params;

    let user = null;
    try {
        const cookieStore = await cookies();
        const req = { cookies: cookieStore };
        const authResult = authenticateUser(req);
        if (authResult.success) user = authResult;
    } catch (e) {
        // Ignore auth errors
    }

    try {
        console.log(`[DEBUG] Page requesting article ID: ${id}`);
        const data = await getArticleByIdService({ id, user });
        console.log(`[DEBUG] Service response for ID ${id}:`, {
            success: data.success,
            hasArticle: !!data.article,
            error: data.error
        });

        if (!data.success || !data.article) {
            console.error(`Article Fetch Failed for ID ${id}:`, data);
            if (data.status === 403 && data.requiresLogin) {
                // Optionally redirect here or show different UI
                console.log("Redirecting to login due to 403");
            }
            notFound();
        }

        if (data.article && data.article.sections) {
            // Respect database order
            // data.article.sections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 
        }

        return <ArticleView article={data.article} userInfo={data.userInfo} readingProgress={data.readingProgress} />;
    } catch (error) {
        console.error("[DEBUG] Error in Page:", error);
        notFound();
    }
}
