import Link from "next/link";
import OuterArticleCard from "../OuterArticleCard";
import sharpIcon from "../../assets/sharp.svg";

export default function RecommendedSection({ articles = [] }) {
    // Show first 3-5 articles or how many fit well. Design shows 3.
    // Use props instead of static/missing import to keep dynamic data working
    const recommendedArticles = articles.slice(0, 3);

    return (
        <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#1E4032]">Recommended For You</h2>
                <Link href="/user-dashboard/rupies-talk" className="text-sm font-semibold text-[#1E4032] hover:underline">
                    See All
                </Link>
            </div>

            <div className="flex flex-col gap-6">
                {recommendedArticles.length > 0 ? (
                    recommendedArticles.map((article) => (
                        <OuterArticleCard
                            key={article._id || article.id}
                            iconSrc={sharpIcon}
                            title={article.mainHeading || article.title}
                            date={new Date(article.createdAt || article.date).toLocaleDateString()}
                            description={article.description}
                            category={article.category}
                            author={article.author}
                            sectionCount={article.sections ? article.sections.length : (article.sectionCount || 0)}
                            link={article.productId
                                ? `/user-dashboard/subscription/${article.productId}/articles/${article._id || article.id}`
                                : `/user-dashboard/articles/${article._id || article.id}`}
                            isLogged={true}
                            id={article._id || article.id}
                            productId={article.productId}
                        />
                    ))
                ) : (
                    <p className="text-gray-500">No recommended articles found.</p>
                )}
            </div>
        </div>
    );
}
