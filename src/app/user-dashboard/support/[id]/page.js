"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import SupportChat from '@/app/components/SupportChat';
import GlobalLoader from '@/app/components/GlobalLoader';

export default function UserTicketDetailPage({ params }) {

    const unwrappedParams = use(params);

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (unwrappedParams?.id) fetchTicket(unwrappedParams.id);
    }, [unwrappedParams?.id]);

    const fetchTicket = async (ticketId) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/user/support/tickets/${ticketId}`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setTicket(data.ticket);
            } else {
                setError(data.error || 'Failed to load ticket');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (message, attachments = []) => {
        // Optimistic return or handle failure in component
        const response = await fetch(`/api/user/support/tickets/${ticket._id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message, attachments })
        });

        if (!response.ok) {
            throw new Error('Failed to send');
        }

        const data = await response.json();
        return data.ticket;
    };

    if (loading) return (
        <GlobalLoader fullScreen={false} className="min-h-[80vh]" />
    );

    if (error || !ticket) return (
        <div className="p-8 text-center">
            <p className="text-red-500 mb-4">{error || "Ticket not found"}</p>
            <button onClick={() => router.back()} className="text-gray-500 hover:underline">Go Back</button>
        </div>
    );

    return (
        <>
            <div className="mb-4">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-gray-500 hover:text-[#C0934B] font-medium transition text-sm"
                >
                    <span className="mr-1">←</span> Back to Tickets
                </button>
            </div>

            <SupportChat
                ticket={ticket}
                onSendMessage={handleSendMessage}
                userType="user"
                otherPartyName={(() => {
                    // 1. If status is waiting, show "Waiting..."
                    if (ticket.status === 'waiting') return 'Waiting...';

                    // 2. If ticket has assignedAdmin name, use it
                    if (ticket.assignedAdmin?.name) return ticket.assignedAdmin.name;

                    // 3. If ticket is explicitly assigned via assignedTo, show that admin's name
                    if (ticket.assignedTo && ticket.assignedTo.name) return ticket.assignedTo.name;

                    // 4. Try to find an admin from message history (excluding "System")
                    const lastAdminMsg = [...(ticket.messages || [])].reverse().find(m => m.isAdmin);

                    if (lastAdminMsg) {
                        // If it's a real admin name, use it
                        if (lastAdminMsg.adminName && lastAdminMsg.adminName !== 'System') {
                            return lastAdminMsg.adminName;
                        }

                        // If it's a "System" message, try to extract from text like "marked as open by [Name]"
                        if (lastAdminMsg.adminName === 'System' && lastAdminMsg.message.includes('by ')) {
                            const parts = lastAdminMsg.message.split('by ');
                            if (parts[1]) return parts[1].trim();
                        }

                        // Fallback if we have a user object
                        if (lastAdminMsg.user && lastAdminMsg.user.name) return lastAdminMsg.user.name;
                    }

                    // 5. Default fallback
                    return 'RupieTimes Admin';
                })()}
                otherPartyEmail={ticket.assignedAdmin?.email || 'support@rupeitime.com'}
            />
        </>
    );
}
