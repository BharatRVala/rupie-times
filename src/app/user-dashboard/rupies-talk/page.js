import ArticleList from "../../rupiesTimeTalk/ArticleList";


export const metadata = {
    title: "Rupie Times Talk | Dashboard",
    description: "Latest market news and updates.",
};

export default function DashboardRupiesTalkPage() {
    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Reuse the existing ArticleList component */}
                <ArticleList />
            </div>
        </>
    );
}
