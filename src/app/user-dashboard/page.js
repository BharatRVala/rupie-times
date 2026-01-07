"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { dashboardData } from "../data/dashboardData";
import Image from "next/image";
import SummaryStats from "../components/dashboard/SummaryStats";
import SubscribedProducts from "../components/dashboard/SubscribedProducts";
import RightSidebar from "../components/dashboard/RightSidebar";
import RecommendedSection from "../components/dashboard/RecommendedSection";
import GlobalLoader from "../components/GlobalLoader";

export default function DashboardPage() {
  const router = useRouter();

  // State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    {
      id: 1,
      label: "Total Subscribed Products",
      value: 0,
      icon: "products.svg",
      path: "/user-dashboard/subscription",
    },
    {
      id: 2,
      label: "Total Newsletters",
      value: 0,
      icon: "subscription.svg",
      path: "/user-dashboard/products",
    },
    {
      id: 3,
      label: "Total Orders",
      value: 0,
      icon: "cart.svg",
      path: "/user-dashboard/orders",
    },
  ]);
  const [subscribedProductsData, setSubscribedProductsData] = useState({
    ...dashboardData.subscribedProducts,
    items: [],
    emptyState: {
      icon: "products.svg",
      message: "You haven't subscribed to any products yet.",
    },
  });
  const [notificationsData, setNotificationsData] = useState(
    dashboardData.notifications
  );
  const [recommendedArticles, setRecommendedArticles] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // --- CRITICAL DATA (Blocking Loader) ---
      // 1. Fetch User Profile
      const profilePromise = fetch("/api/user/auth/profile", {
        credentials: "include",
      });
      // 2. Fetch Subscriptions
      const subscriptionsPromise = fetch("/api/user/subscriptions?status=all", {
        credentials: "include",
      });
      // 3. Fetch Orders
      const ordersPromise = fetch("/api/user/orders", {
        credentials: "include",
      });
      // 4. Fetch Total Newsletters (Products)
      const productsPromise = fetch("/api/user/products?limit=1", {
        credentials: "include",
      });

      const [profileRes, subsRes, ordersRes, productsRes] = await Promise.all([
        profilePromise,
        subscriptionsPromise,
        ordersPromise,
        productsPromise
      ]);

      if (profileRes.status === 401) {
        router.push("/auth");
        return;
      }

      // Process User
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData.user);
      }

      // Process Subscriptions
      let activeSubsCount = 0;
      let subscriptionItems = [];
      let totalProductsCount = 0;

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        const subscriptions = subsData.subscriptions || [];

        totalProductsCount = subscriptions.length;
        activeSubsCount = subscriptions.filter((sub) => sub.isActive).length;

        subscriptionItems = subscriptions
          .filter(
            (sub) =>
              sub.isActive ||
              sub.status === "active" ||
              sub.status === "expiresoon"
          )
          .sort((a, b) => new Date(b.startDate) - new Date(a.startDate)) // Sort by latest
          .slice(0, 2) // Limit to 2
          .map((sub) => {
            const product = sub.product || {};
            return {
              id: product._id,
              image: product.filename
                ? `/api/admin/products/image/${product.filename}`
                : "/placeholder-image.png",
              title: product.heading || "Unknown Product",
              description: product.shortDescription || "",
              startDate: new Date(sub.startDate).toLocaleDateString(),
              endDate: new Date(sub.endDate).toLocaleDateString(),
              status: sub.isActive ? "Active" : "Expired",
              latestArticleId: product.latestArticleId, // ✅ Include latest article ID
            };
          });

        setSubscribedProductsData((prev) => ({
          ...prev,
          items: subscriptionItems,
        }));
      }

      // Process Orders
      let ordersCount = 0;
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        ordersCount =
          ordersData.summary?.totalOrders ||
          (ordersData.orders ? ordersData.orders.length : 0);
      }

      // Process Products Count
      let totalNewslettersCount = 0;
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        totalNewslettersCount = productsData.pagination?.total || 0;
      }

      // Update Stats immediately
      setStats([
        {
          id: 1,
          label: "Total Subscribed Newsletters",
          value: totalProductsCount,
          icon: "products.svg",
          path: "/user-dashboard/subscription",
        },
        {
          id: 2,
          label: "Total Newsletters",
          value: totalNewslettersCount, // Updated with API count
          icon: "subscription.svg",
          path: "/user-dashboard/products",
        },
        {
          id: 3,
          label: "Total Orders",
          value: ordersCount,
          icon: "cart.svg",
          path: "/user-dashboard/orders",
        },
      ]);

      // Remove Loader ASAP
      setLoading(false);

      // --- SECONDARY DATA (Non-Blocking) ---
      try {
        // 4. Fetch Articles (Recommended)
        const articlesPromise = fetch("/api/user/articles?limit=3", {
          credentials: "include",
        });
        // 5. Fetch Notifications (Latest 3)
        const notificationsPromise = fetch("/api/user/notifications?limit=3", {
          credentials: "include",
          cache: "no-store",
        });

        const [articlesRes, notificationsRes] = await Promise.all([
          articlesPromise,
          notificationsPromise,
        ]);

        // Process Articles
        if (articlesRes.ok) {
          const articlesData = await articlesRes.json();
          setRecommendedArticles(articlesData.articles || []);
        }

        // Process Notifications
        let notificationItems = [];
        if (notificationsRes.ok) {
          const notifData = await notificationsRes.json();
          notificationItems = (notifData.data || []).map((n) => ({
            id: n._id,
            title: n.title,
            subtitle: n.message,
            time: n.createdAt,
            type: n.notificationType,
            group: "Recent",
            isRead: n.isRead,
            message: n.message,
            description: n.message,
            isBroadcast: n.isBroadcast,
            triggeredBy: n.metadata?.triggeredBy,
          }));
        }

        if (notificationItems.length > 0) {
          setNotificationsData((prev) => ({
            ...prev,
            items: notificationItems,
          }));
        }
      } catch (secondaryErr) {
        console.error("Error fetching secondary dashboard data:", secondaryErr);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false); // Ensure loader removal on error
    }
  };

  if (loading) {
    return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
  }

  const userName = user?.name || "User";
  const nameParts = userName.split(" ");
  const lastPart = nameParts.pop();
  const firstPart = nameParts.join(" ");

  return (
    <>
      <div className="w-full xl:w-1/2 bg-[#1E4032] rounded-2xl py-6 px-6 md:px-8 flex flex-col md:flex-row items-center justify-between relative overflow-visible mb-12 shadow-sm mt-8">
        <div className="z-10 text-[#FFFFFF] max-w-lg relative order-2 md:order-1 text-center md:text-left w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {firstPart && <>{firstPart} </>}
            {/* <span className="whitespace-nowrap"> */}
            {lastPart}'s - Research Desk
            <Image
              src="/assets/userDashboard/hello.webp"
              alt="Hello"
              width={28}
              height={28}
              className="inline-block animate-wave ml-2"
            />
            {/* </span> */}
          </h1>
          <p className="text-[#FFFFFF] mb-4 text-sm md:text-base leading-relaxed">
            Read, explore and reflect with research curated for you.
          </p>
        </div>
        <div className="relative z-10 shrink-0 order-1 md:order-2 w-48 h-40 md:w-[260px] md:h-[180px] -mt-16 md:-mt-24 md:-mr-8">
          <Image
            src="/assets/userDashboard/dashboardimage.webp"
            alt="Dashboard Hero"
            width={260}
            height={200}
            className="object-contain w-full h-full drop-shadow-xl"
            priority
            unoptimized
          />
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryStats stats={stats} />

      {/* Main Content Areas */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Subscribed Products */}
        <SubscribedProducts data={subscribedProductsData} />

        {/* Right Column: Notifications & Tickets */}
        <RightSidebar
          notifications={notificationsData}
          ticket={dashboardData.createTicket}
        />
      </div>

      {/* Recommended Section */}
      <RecommendedSection articles={recommendedArticles} />
    </>
  );
}
