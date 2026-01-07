'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import SubscriptionStats from '../../components/dashboard/SubscriptionStats';
import SubscriptionList from '../../components/dashboard/SubscriptionList';
import GlobalLoader from '../../components/GlobalLoader';



export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [userName, setUserName] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        fetchSubscriptions();

        // Check for payment success
        if (searchParams.get('payment_success')) {
            setShowSuccessPopup(true);
            // Clean URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            // Get user name for personalization
            fetch('/api/user/auth/check')
                .then(res => res.json())
                .then(data => {
                    if (data.isLoggedIn && data.user) {
                        setUserName(data.user.name || 'Subscriber');
                    }
                })
                .catch(err => console.error('Failed to get user name', err));
        }
    }, [searchParams]);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch('/api/user/subscriptions?status=all', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setSubscriptions(data.subscriptions || []);
            } else if (response.status === 401) {
                router.push('/auth/login');
            } else {
                console.error('Failed to fetch subscriptions');
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.error || 'Failed to load subscriptions');
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            setError('Network error: Unable to load subscriptions');
        } finally {
            setLoading(false);
        }
    };

    // Real-time status check
    const checkRealTimeStatus = async (subscriptionIds) => {
        try {
            const response = await fetch('/api/user/subscriptions/real-time-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscriptionIds }),
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Real-time status update:', result.results);
                    fetchSubscriptions();
                }
            }
        } catch (error) {
            console.error('Error checking real-time status:', error);
        }
    };

    useEffect(() => {
        if (subscriptions.length > 0) {
            const subscriptionIds = subscriptions.map(sub => sub.id || sub._id).filter(id => id);
            if (subscriptionIds.length > 0) {
                checkRealTimeStatus(subscriptionIds);
            }
        }
    }, [subscriptions.length]);

    const getSubscriptionCounts = () => {
        return {
            active: subscriptions.filter(sub => sub.isActive || (sub.status === 'active' || sub.status === 'expiresoon') && sub.status !== 'expired').length,
            expired: subscriptions.filter(sub => sub.isExpired || sub.status === 'expired').length,
            expiresoon: subscriptions.filter(sub => sub.status === 'expiresoon').length,
        };
    };

    const counts = getSubscriptionCounts();

    if (loading) {
        return <GlobalLoader fullScreen={false} className="min-h-[80vh]" />;
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Title */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#1E4032] mb-2">My Subscriptions</h2>
            </div>

            {/* Stats Section - Ensure it is rendered */}
            <SubscriptionStats counts={counts} />

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                    {error}
                </div>
            )}

            {/* List with Filter */}
            <SubscriptionList subscriptions={subscriptions} />

            {/* Success Popup */}
            {showSuccessPopup && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center relative shadow-2xl transform transition-all animate-fade-in-up border border-green-100">
                        <button
                            onClick={() => setShowSuccessPopup(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FaTimes size={20} />
                        </button>
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FaCheckCircle className="text-green-500 text-4xl" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Subscription Activated!</h3>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            Thank you, <span className="font-bold text-[#C0934B]">{userName}</span>! Your subscription has been successfully processed and is now active.
                        </p>
                        <button
                            onClick={() => setShowSuccessPopup(false)}
                            className="bg-[#C0934B] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#a37c3f] transition-all transform hover:scale-[1.02] shadow-lg shadow-[#C0934B]/20 w-full"
                        >
                            Continue to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
