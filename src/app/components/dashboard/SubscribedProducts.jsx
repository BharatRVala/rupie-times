import Image from "next/image";
import Link from "next/link";

export default function SubscribedProducts({ data }) {
  const hasProducts = data.items && data.items.length > 0;

  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#1E4032]">{data.title}</h2>
        {hasProducts && (
          <Link
            href="/user-dashboard/subscription"
            className="text-sm font-semibold text-[#1E4032] hover:underline"
          >
            See All
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {hasProducts ? (
          data.items.map((product, index) => (
            <div
              key={product.id || product._id || index}
              className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col"
            >
              <div className="relative h-64 w-full bg-gray-200 shrink-0">
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-lg text-[#1E4032] mb-2 line-clamp-1" title={product.title}>
                  {product.title}
                </h3>

                <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                  {product.description}
                </p>

                <div className="space-y-2 text-sm mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Start date :</span>
                    <span className="text-gray-900 font-medium">{product.startDate}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">End date :</span>
                    <span className="text-gray-900 font-medium">{product.endDate}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Status :</span>
                    <span
                      className={`font-bold ${product.status === "Active"
                        ? "text-green-600"
                        : "text-red-500"
                        }`}
                    >
                      {product.status}
                    </span>
                  </div>
                </div>

                <Link
                  href={product.latestArticleId
                    ? `/user-dashboard/subscription/${product.id}/articles/${product.latestArticleId}`
                    : `/user-dashboard/subscription/${product.id}/articles`}
                  className="block w-full text-center py-3 bg-[#C0934B] text-white font-semibold rounded-lg hover:bg-[#a37c3f] transition-colors mt-auto"
                >
                  View Articles
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 rounded-xl border border-gray-200 border-dashed">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Image
                src={`/assets/userDashboard/${data.emptyState.icon}`}
                alt="Empty"
                width={32}
                height={32}
                className="grayscale opacity-50"
              />
            </div>
            <p className="text-gray-500 font-medium max-w-xs">
              {data.emptyState.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
