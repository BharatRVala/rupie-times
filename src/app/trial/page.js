"use client";

import React, { useState, useEffect } from 'react';
import GlobalLoader from '../components/GlobalLoader';

const TrialPage = () => {
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contactNumber: '',
        homeAddress: '',
        productId: ''
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch('/api/user/products');
                const data = await response.json();
                if (data.success) {
                    setProducts(data.products || data.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch products:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus({ type: '', message: '' });

        const selectedProduct = products.find(p => p._id === formData.productId);
        const productName = selectedProduct ? selectedProduct.heading : 'Unknown Product';


        try {
            const res = await fetch('/api/trial/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, productName })
            });
            const data = await res.json();

            if (data.success) {
                setStatus({ type: 'success', message: 'Trial request submitted successfully! We will contact you soon.' });
                setFormData({ name: '', email: '', contactNumber: '', homeAddress: '', productId: '' });
            } else {
                setStatus({ type: 'error', message: data.message || 'Something went wrong. Please try again.' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to submit request.' });
        } finally {
            setSubmitting(false);
        }
    };

    // Base Primary Color
    const primaryColor = '#00301F';

    if (loading) {
        return (
            <div className="relative w-full h-screen flex justify-center items-center">
                <GlobalLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-md w-full space-y-8 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-10 rounded-xl shadow-lg">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-primary">
                        Request a Free Trial
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Experience our premium products before committing.
                    </p>
                </div>

                {status.message && (
                    <div className={`p-4 rounded-md ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {status.message}
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#00301F] focus:border-[#00301F] focus:z-10 sm:text-sm mt-1"
                                placeholder="Full Name"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#00301F] focus:border-[#00301F] focus:z-10 sm:text-sm mt-1"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number</label>
                            <input
                                id="contactNumber"
                                name="contactNumber"
                                type="tel"
                                required
                                value={formData.contactNumber}
                                onChange={handleChange}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#00301F] focus:border-[#00301F] focus:z-10 sm:text-sm mt-1"
                                placeholder="Your Contact Number"
                            />
                        </div>
                        <div>
                            <label htmlFor="homeAddress" className="block text-sm font-medium text-gray-700">Home Address</label>
                            <textarea
                                id="homeAddress"
                                name="homeAddress"
                                required
                                rows={3}
                                value={formData.homeAddress}
                                onChange={handleChange}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#00301F] focus:border-[#00301F] focus:z-10 sm:text-sm mt-1"
                                placeholder="Complete Address"
                            />
                        </div>

                        <div>
                            <label htmlFor="productId" className="block text-sm font-medium text-gray-700">Product</label>
                            <select
                                id="productId"
                                name="productId"
                                required
                                value={formData.productId}
                                onChange={handleChange}
                                className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#00301F] focus:border-[#00301F] sm:text-sm mt-1"
                            >
                                <option value="">Select a Product</option>
                                {products.map((product) => (
                                    <option key={product._id} value={product._id}>
                                        {product.heading}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#00301F] hover:bg-[#002417] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00301F] transition-colors"
                        >
                            {submitting ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : 'Send Trial Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TrialPage;
