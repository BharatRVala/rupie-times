import React from 'react';
import { notFound } from 'next/navigation';
import ArticleView from '../../../rupiesTimeTalk/[id]/ArticleView';
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
            title: `${article.mainHeading} - Dashboard View`,
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

    let articleData = null;
    let redirectUrl = null;

    try {
        const data = await getArticleByIdService({ id, user });

        if (data.success && data.article) {
            articleData = data;
        }
    } catch (error) {
        // Fall through to check for product article
    }

    if (!articleData) {
        // CHECK IF IT IS A PRODUCT ARTICLE
        const { getProductByArticleIdService } = await import('@/app/lib/services/productService');
        const productCheck = await getProductByArticleIdService(id);

        if (productCheck.success && productCheck.product) {
            const { redirect } = await import('next/navigation');
            redirect(`/user-dashboard/subscription/${productCheck.product._id}/articles/${id}`);
        }

        notFound();
    }

    // Reuse ArticleView with dashboard basePath
    return (
        <ArticleView
            article={articleData.article}
            userInfo={articleData.userInfo}
            readingProgress={articleData.readingProgress}
            basePath="/user-dashboard/articles"
            backLabel="Back to Dashboard Articles"
        />
    );
}
