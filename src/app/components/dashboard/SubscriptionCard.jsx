import Image from "next/image";
import Link from "next/link";


export default function SubscriptionCard({ subscription, onViewArticles }) {
  // Helper to extract values whether from flat props or nested API objects
  const title = subscription.product?.heading || subscription.title || 'Unknown Product';
  const description = subscription.product?.shortDescription || subscription.description || '';
  const price = subscription.variant?.price || subscription.price || 0;
  const duration = subscription.variant?.duration || subscription.duration || 'N/A';

  // Resolve Image URL
  const imageFilename = subscription.product?.filename || subscription.image;
  const imageUrl = imageFilename
    ? (imageFilename.startsWith('http') ? imageFilename : `/api/admin/products/image/${imageFilename}`)
    : null;

  // Date formatting
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const startDate = formatDate(subscription.startDate);
  const endDate = formatDate(subscription.endDate);

  // Status Logic
  const status = subscription.status === 'expiresoon' ? 'Expiring soon' :
    subscription.status ? (subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)) : 'Unknown';

  return (
    <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Product Image */}
      <div className="relative h-48 w-full bg-gray-200 group">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
            No Image
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-[#1E4032] line-clamp-1">{title}</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status === 'Active' ? 'bg-[#E6F8EB] text-[#1E4032]' :
            status === 'Expiring soon' ? 'bg-[#FFF8DC] text-[#C0934B]' :
              'bg-[#FFE4E4] text-[#D32F2F]'
            }`}>
            {status}
          </span>
        </div>

        <p className="text-xs text-gray-500 line-clamp-2 mb-4">
          {description}
        </p>

        <div className="space-y-2 text-xs mb-6 text-gray-600 font-medium">
          <div className="flex justify-between">
            <span>Price :</span>
            <span className="text-gray-900">₹{price}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration :</span>
            <span className="text-gray-900">{duration}</span>
          </div>
          <div className="flex justify-between">
            <span>Started :</span>
            <span className="text-gray-900">{startDate}</span>
          </div>
          <div className="flex justify-between">
            <span>Expired :</span>
            <span className={`${status === 'Expired' ? "text-red-500" : "text-gray-900"
              }`}>{endDate}</span>
          </div>
          <div className="flex justify-between">
            <span>Days left :</span>
            <span className="text-gray-900">{subscription.daysRemaining || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment :</span>
            <span className="text-[#397767] capitalize">{subscription.paymentStatus}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          {/* View Articles Button - Shown for Active and Expiring Soon */}
          {/* View Articles Button - Shown for Active and Expiring Soon */}
          {((status !== 'Expired' && subscription.status !== 'expired') || (status === 'Expiring soon' || subscription.status === 'expiresoon')) && (
            <Link
              href={subscription.product?.latestArticleId
                ? `/user-dashboard/subscription/${subscription.product._id}/articles/${subscription.product.latestArticleId}`
                : `/user-dashboard/subscription/${subscription.product?._id || subscription.productId}/articles`
              }
              className="flex-1 block text-center py-2.5 bg-[#C0934B] text-white text-sm font-bold rounded-lg hover:bg-[#a37c3f] transition-colors"
            >
              Start Reading
            </Link>
          )}

          {/* Renew Button - Shown for Expiring Soon */}
          {(status === 'Expiring soon' || subscription.status === 'expiresoon') && (
            <button
              onClick={() => {
                const productId = subscription.product?._id || subscription.productId;
                if (productId) window.location.href = `/user-dashboard/products/${productId}`;
              }}
              className="flex-1 block text-center py-2.5 bg-[#0b2b20] text-white text-sm font-bold rounded-lg hover:bg-[#1E4032] transition-colors"
            >
              Renew
            </button>
          )}

          {/* View Products Button - Shown ONLY for Expired (replaces View Articles) */}
          {(status === 'Expired' || subscription.status === 'expired') && (
            <button
              onClick={() => {
                const productId = subscription.product?._id || subscription.productId;
                if (productId) window.location.href = `/user-dashboard/products/${productId}`;
              }}
              className="w-full block text-center py-2.5 bg-[#0b2b20] text-white text-sm font-bold rounded-lg hover:bg-[#1E4032] transition-colors"
            >
              View Products
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
