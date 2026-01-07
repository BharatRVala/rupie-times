"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AdminModal from "@/app/components/admin/AdminModal";
import GlobalLoader from "@/app/components/GlobalLoader";
import { Search } from "lucide-react";

export default function AdminsPage() {
    const [allAdmins, setAllAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [currentAdmin, setCurrentAdmin] = useState(null);
    
    // Client-side controls
    const [searchQuery, setSearchQuery] = useState("");
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const router = useRouter();

    useEffect(() => {
        fetchCurrentAdmin();
        fetchAdmins();
    }, []);

    const fetchCurrentAdmin = async () => {
        try {
            const response = await fetch('/api/admin/auth/profile');
            if (response.ok) {
                const data = await response.json();
                setCurrentAdmin(data.admin);
            }
        } catch (error) {
            console.error("Error fetching current admin:", error);
        }
    };

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            // Fetch ALL admins for client-side filtering
            const res = await fetch('/api/admin/admins?limit=10000');
            const data = await res.json();
            if (data.success) {
                setAllAdmins(data.admins);
            }
        } catch (error) {
            console.error("Failed to fetch admins:", error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return "AD";
        const names = name.split(" ");
        return `${names[0]?.charAt(0) || ""}${names[1]?.charAt(0) || ""}`.toUpperCase();
    };

    // Client-side Filtering
    const filteredAdmins = useMemo(() => {
        if (!allAdmins) return [];
        if (!searchQuery) return allAdmins;

        const lowerQuery = searchQuery.toLowerCase();
        return allAdmins.filter(admin => 
            (admin.name && admin.name.toLowerCase().includes(lowerQuery)) ||
            (admin.email && admin.email.toLowerCase().includes(lowerQuery)) ||
            (admin.mobile && admin.mobile.toLowerCase().includes(lowerQuery))
        );
    }, [allAdmins, searchQuery]);

    // Client-side Pagination
    const visibleAdmins = useMemo(() => {
        if (itemsPerPage === 'All') return filteredAdmins;
        return filteredAdmins.slice(0, itemsPerPage);
    }, [filteredAdmins, itemsPerPage]);

    const handleAddAdmin = () => {
        setModalMode("create");
        setSelectedAdmin(null);
        setIsModalOpen(true);
    };

    const handleEditAdmin = (admin) => {
        const mappedAdmin = { ...admin, contact: admin.mobile };
        setModalMode("edit");
        setSelectedAdmin(mappedAdmin);
        setIsModalOpen(true);
    };

    const handleDeleteAdmin = async (id) => {
        if (!confirm("Are you sure you want to delete this admin?")) return;

        try {
            const res = await fetch(`/api/admin/admins/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchAdmins();
            } else {
                alert(data.message || "Failed to delete");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("Delete failed");
        }
    };

    const handleModalSubmit = async (formData) => {
        const url = modalMode === "create" ? '/api/admin/admins' : `/api/admin/admins/${selectedAdmin.id}`;
        const method = modalMode === "create" ? 'POST' : 'PUT';

        const body = {
            name: formData.name,
            email: formData.email,
            mobile: formData.contact,
            role: formData.role === 'Super Admin' ? 'super_admin' : 'admin',
            password: formData.password
        };

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.success) {
                setIsModalOpen(false);
                fetchAdmins();
            } else {
                const errorMsg = data.errors ? data.errors.join('\n') : (data.message || "Operation failed");
                alert(errorMsg);
            }
        } catch (error) {
            console.error("Submit error:", error);
            alert("Something went wrong");
        }
    };

    const isSuperAdmin = currentAdmin?.role === 'super_admin';

    if (loading) {
        return (
            <div className="h-[calc(100vh-200px)] w-full relative">
                <GlobalLoader fullScreen={false} />
            </div>
        );
    }

    return (
        <div className="w-full space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Admin Management</h2>
                    <p className="text-gray-500 mt-1">Manage your Admin information</p>
                </div>
                {/* Add Admin Button */}
                {isSuperAdmin && (
                    <button
                        onClick={handleAddAdmin}
                        className="flex items-center gap-2 bg-[#C0934B] text-white px-4 py-2 rounded-lg hover:bg-[#a88040] transition-colors text-sm font-medium"
                    >
                        <span className="text-lg">+</span> Add Admin
                    </button>
                )}
            </div>

            {/* Main Content Card: Controls & Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Control Bar (Rows per page & Search) */}
                <div className="flex flex-col md:flex-row justify-end items-center p-4 border-b border-gray-100 gap-4">
                     <div className="flex items-center gap-3 w-full md:w-auto">
                         {/* Rows Per Page */}
                         <div className="relative">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                                className="appearance-none px-4 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] bg-white cursor-pointer text-sm"
                            >
                                <option value={10}>10</option>
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="All">All</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Search Box */}
                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Search here..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] transition-colors text-sm"
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#CFA56B] text-white">
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap first:rounded-tl-none last:rounded-tr-none">User</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Contact</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Joined</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Role</th>
                                <th className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visibleAdmins.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        {searchQuery ? "No matching admins found." : "No admins found."}
                                    </td>
                                </tr>
                            ) : (
                                visibleAdmins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* User Column */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#faeccd] flex items-center justify-center text-[#C0934B] font-semibold text-sm border border-[#C0934B]/20 shrink-0">
                                                    {getInitials(admin.name)}
                                                </div>
                                                <div className="font-medium text-gray-900 text-sm">{admin.name}</div>
                                            </div>
                                        </td>

                                        {/* Contact Column */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">{admin.email}</span>
                                                <span className="text-xs text-gray-500">{admin.mobile}</span>
                                            </div>
                                        </td>

                                        {/* Joined Column */}
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(admin.createdAt).toLocaleDateString('en-GB')}
                                        </td>

                                        {/* Role Column */}
                                        <td className="px-6 py-4">
                                             <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${admin.role === 'super_admin' || admin.role === 'super-admin'
                                                    ? "bg-purple-100 text-purple-700"
                                                    : "bg-blue-100 text-blue-700"
                                                    }`}
                                            >
                                                {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                            </span>
                                        </td>

                                        {/* Action Column */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {/* Edit Button */}
                                                {(isSuperAdmin || currentAdmin?.id === admin.id) && (
                                                    <button
                                                        onClick={() => handleEditAdmin(admin)}
                                                        className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                        title="Edit"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Delete Button */}
                                                {isSuperAdmin && currentAdmin?.id !== admin.id && (
                                                    <button
                                                        onClick={() => handleDeleteAdmin(admin.id)}
                                                        className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                        title="Delete"
                                                    >
                                                        <Image src="/assets/delete.svg" alt="Delete" width={16} height={16} className="brightness-0 invert" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <AdminModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    mode={modalMode}
                    initialData={selectedAdmin}
                    onSubmit={handleModalSubmit}
                />
            )}
        </div>
    );
}
