import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import OuterArticleCard from "../../components/OuterArticleCard";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import { dashboardData } from "../../data/dashboardData";
import sharpIcon from "../../assets/sharp.svg";

export default function ProductArticlesView({ product, backLink = "/user-dashboard" }) {
    const articles = product.articles || [];

    // Calculate days remaining (Mock logic or based on dates)
    const calculateDaysRemaining = (end) => {
        // Simple mock for now as dates are static strings
        return 40;
    };

    return (
        <div className="max-w-7xl mx-auto">
            <DashboardHeader data={dashboardData.header} />

            <div className="h-px bg-gray-200 w-full mb-8" />

            <div className="mb-6">
                <Link href={backLink} className="inline-flex items-center text-sm font-medium text-[#397767] hover:underline">
                    <FaArrowLeft className="mr-2" />
                    Back To Subscription
                </Link>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 justify-between items-start mb-10">
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold text-[#1E4032] mb-3">{product.title}</h1>
                    <p className="text-gray-500 text-sm/relaxed">
                        {product.fullDescription || product.description}
                    </p>
                </div>

                <div className="backdrop-blur supports-[backdrop-filter]:bg-[#E6F8EB]/10 bg-[#E6F8EB]/10 border border-[#C5E8D0] rounded-xl p-6 w-full lg:w-80 shrink-0">
                    <span className="inline-block bg-[#86D997] text-[#1E4032] text-xs font-bold px-3 py-1 rounded-full mb-3">
                        Active Subscription
                    </span>
                    <p className="text-xs font-semibold text-[#1E4032] mb-1">
                        Subscription Started : <span className="font-normal">{product.startDate}</span>
                    </p>
                    <p className="text-xs font-semibold text-[#1E4032]">
                        {calculateDaysRemaining(product.endDate)} days remaining
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {articles.length > 0 ? articles.map((article) => (
                    <OuterArticleCard
                        key={article.id}
                        iconSrc={sharpIcon}
                        title={article.title}
                        date={article.date}
                        description={article.description}
                        category={article.category}
                        author={article.author}
                        sectionCount={article.readTime}
                        link={`/user-dashboard/subscription/${product.id}/articles/${article.id}`}
                        priority={article.priority}
                    />
                )) : (
                    <div className="text-center py-10 text-gray-500">
                        No articles found for this subscription.
                    </div>
                )}
            </div>
        </div>
    );
}
