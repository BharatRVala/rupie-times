"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GlobalLoader from "../../components/GlobalLoader";

export default function UserProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        fullName: '',
        mobile: '',
        email: '',
        password: 'abc', // Dummy placeholder
        confirmPassword: ''
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const response = await fetch('/api/user/auth/profile', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                setFormData(prev => ({
                    ...prev,
                    fullName: data.user.name,
                    email: data.user.email,
                    mobile: data.user.mobile,
                }));
            } else if (response.status === 401) {
                router.push('/auth');
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Prepare data
        const updateData = {
            name: formData.fullName, // Map fullName to name
            email: formData.email,
            mobile: formData.mobile
        };

        // Password logic
        if (formData.confirmPassword && formData.confirmPassword !== '') {
            if (formData.password && formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            // Only if they actually typed a real new password (logic can be refined based on backend requirements)
            // If "password" field in form is treated as "new password"
            if (formData.confirmPassword) {
                updateData.password = formData.confirmPassword;
            }
        }

        try {
            const response = await fetch('/api/user/auth/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                setUser(result.user);
                setIsEditing(false);
                setSuccess('Profile updated successfully!');
                setFormData(prev => ({
                    ...prev,
                    password: 'abc',
                    confirmPassword: ''
                }));
                fetchUserProfile();
            } else {
                setError(result.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setError('Failed to update profile');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const response = await fetch('/api/user/delete', {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                alert('Account deleted successfully');
                router.push('/auth');
            } else {
                setError(result.message || 'Failed to delete account');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            setError('Failed to delete account');
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    const handleCancel = () => {
        setIsEditing(false);
        setError('');
        setSuccess('');
        // Reset form to original user data
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: user.name,
                email: user.email,
                mobile: user.mobile,
                password: 'abc',
                confirmPassword: ''
            }));
        }
    };

    if (loading) {
        return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
    }

    return (
        <div className="font-sans text-black p-6">
            {/* Content Switch */}
            {!isEditing ? (
                <>
                    {/* Title & Edit Button Row */}
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-[#1E4032]">Profile</h2>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="border border-[#1E4032] text-[#1E4032] px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Edit Profile
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                            {success}
                        </div>
                    )}

                    {/* View Mode: Profile Card */}
                    <div className="border border-gray-200 rounded-2xl p-8 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 max-w-4xl">

                        {/* Avatar & Name */}
                        <div className="flex items-center gap-6 mb-12">
                            <div className="w-20 h-20 rounded-2xl bg-[#D9D9D9] flex items-center justify-center text-[#1E4032] text-2xl font-medium shrink-0">
                                {getInitials(user?.name)}
                            </div>
                            <h3 className="text-2xl font-bold text-[#1E4032]">{user?.name}</h3>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 mb-12">
                            <div>
                                <p className="text-gray-500 text-sm mb-2">Email</p>
                                <p className="font-semibold text-[#1E4032]">{user?.email}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm mb-2">Mobile</p>
                                <p className="font-semibold text-[#1E4032]">{user?.mobile}</p>
                            </div>
                        </div>

                        {/* <div className="h-px bg-gray-200 w-full mb-8" /> */}

                        {/* Danger Zone */}
                        {/* <div>
                            <h4 className="text-red-500 font-bold mb-4">Danger Zone</h4>
                            <div className="bg-[#FFEFEF] border border-[#FFDcdc] rounded-xl p-8">
                                <p className="text-[#DE5F5F] mb-6">
                                    Irreversible action. This will permanently delete your account and remove all data.
                                </p>
                                {showDeleteConfirm ? (
                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleDeleteAccount}
                                            className="bg-[#FF4D4D] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#ff3333] transition-colors shadow-sm shadow-red-200"
                                        >
                                            Yes, I&apos;m sure
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="text-gray-600 px-6 py-2 text-sm font-medium"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="bg-[#FF4D4D] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#ff3333] transition-colors shadow-sm shadow-red-200"
                                    >
                                        Delete Account
                                    </button>
                                )}
                            </div>
                        </div> */}
                    </div>
                </>
            ) : (
                <>
                    {/* Edit Mode Header */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-[#1E4032]">Edit Profile</h2>
                        <p className="text-sm text-gray-600">Manage your account information</p>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm max-w-4xl">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm max-w-4xl">
                            {success}
                        </div>
                    )}

                    {/* Edit Form Card */}
                    <div className="border border-gray-200 rounded-2xl p-8 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 max-w-4xl">
                        <div className="flex flex-col gap-6">

                            {/* Full Name */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-600">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="border border-[#1E4032] rounded-lg px-4 py-3 text-[#1E4032] focus:outline-none focus:ring-1 focus:ring-[#1E4032]"
                                />
                            </div>

                            {/* Mobile & Email Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-600">Mobile</label>
                                    <input
                                        type="text"
                                        value={formData.mobile}
                                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                        className="border border-gray-300 rounded-lg px-4 py-3 text-gray-600 focus:outline-none focus:border-[#1E4032]"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-600">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="border border-gray-300 rounded-lg px-4 py-3 text-gray-600 focus:outline-none focus:border-[#1E4032]"
                                    />
                                </div>
                            </div>

                            {/* Passwords Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-600">Password</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="border border-gray-300 rounded-lg px-4 py-3 text-gray-600 focus:outline-none focus:border-[#1E4032]"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-600">Confirm New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Enter to change password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="border border-gray-300 rounded-lg px-4 py-3 text-gray-600 focus:outline-none focus:border-[#1E4032]"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-4 mt-4">
                                <button
                                    onClick={handleSubmit}
                                    className="bg-[#C0934B] text-white px-8 py-3 rounded-lg text-sm font-semibold hover:bg-[#a37936] transition-colors"
                                >
                                    Update Profile
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="border border-[#C0934B] text-[#C0934B] px-8 py-3 rounded-lg text-sm font-semibold hover:bg-[#fff9e6] transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>

                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
