import Link from "next/link";
import NotificationItem from "./NotificationItem";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";

export default function RightSidebar({ notifications, ticket }) {
  const [items, setItems] = useState(notifications.items || []);

  useEffect(() => {
    if (notifications.items) {
      setItems(notifications.items);
    }
  }, [notifications.items]);

  const handleDelete = async (id) => {
    try {
      // Optimistic update
      setItems(prev => prev.filter(item => (item._id || item.id) !== id));

      const response = await fetch('/api/user/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });

      if (!response.ok) {
        console.error('Failed to delete notification');
        // Optionally revert state here if critical
      } else {
        window.dispatchEvent(new Event('notificationUpdated'));
      }
    } catch (e) {
      console.error('Delete error', e);
    }
  };

  return (
    <div className="w-full lg:w-96 flex flex-col gap-6">
      {/* Notifications Box */}
      <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#1E4032]">{notifications.title}</h2>
          <Link href="/user-dashboard/notifications" className="text-sm font-semibold text-[#1E4032] hover:underline">
            See All
          </Link>
        </div>

        <div className="space-y-4">
          <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">TODAY</h3>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {items.slice(0, 5).map((item) => {
                // Use the type directly from the API if available, otherwise fallback to keyword matching
                let uiType = item.type || 'info';
                const isBroadcast = item.isBroadcast || item.triggeredBy === 'admin';
                const titleLower = (item.title || '').toLowerCase();

                // Only perform keyword matching for non-broadcasts or if type is generic
                if (!isBroadcast || uiType === 'info' || uiType === 'general') {
                  if (uiType === 'subscription_active' || titleLower.includes('activated') || titleLower.includes('active')) {
                    uiType = 'success';
                  } else if (uiType === 'subscription_expired' || titleLower.includes('expired')) {
                    uiType = 'expired';
                  } else if (uiType === 'subscription_expiring_soon' || titleLower.includes('expiring soon')) {
                    uiType = 'warning';
                  } else if (uiType === 'ticket_reply' || titleLower.includes('ticket')) {
                    uiType = 'chat';
                  }
                }

                return (
                  <NotificationItem
                    key={item.id || item._id}
                    notification={{
                      ...item,
                      description: item.description || item.message || item.subtitle,
                      type: uiType
                    }}
                    variant="compact"
                    onDelete={handleDelete}
                  />
                );
              })}
            </AnimatePresence>
            {items.length === 0 && (
              <p className="text-sm text-gray-500 italic">No notifications yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Create Ticket Box */}
      <div className="bg-[#397767] rounded-xl p-6 text-white text-center shadow-lg">
        <p className="text-sm/relaxed mb-6 font-medium opacity-90">
          {ticket.text}
        </p>
        <Link
          href={ticket.path || "/user-dashboard/support/create-ticket"}
          className="inline-flex items-center justify-center px-6 py-2.5 border border-white text-white font-semibold rounded-lg hover:backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10/10 transition-colors w-full sm:w-auto"
        >
          {ticket.buttonText}
        </Link>
      </div>
    </div>
  );
}
