'use client';
import React from 'react';
import {
    TrendingUp,
    Users,
    Target,
    BarChart3,
    ShieldCheck,
    Zap,
    ArrowRight,
    Mail,
    Phone,
    CheckCircle2,
    Megaphone,
    Handshake,
    MapPin,
    Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { advertiseData } from '../data/advertiseData';
import { useState } from 'react';
const AdvertiseWithUs = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("idle"); // idle, loading, success, error
    const [message, setMessage] = useState("");
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        companyName: '',
        workEmail: '',
        interest: 'Display Advertising'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus("loading");
        setMessage("");

        try {
            const res = await fetch('/api/advertise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success) {
                setStatus("success");
                setMessage("Inquiry sent successfully! We will contact you soon.");
                setFormData({
                    firstName: '',
                    lastName: '',
                    companyName: '',
                    workEmail: '',
                    interest: 'Display Advertising'
                });
            } else {
                setStatus("error");
                setMessage(data.message || 'Failed to send inquiry.');
            }
        } catch (error) {
            console.error('Submit error:', error);
            setStatus("error");
            setMessage('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const iconMap = {
        TrendingUp: TrendingUp,
        Users: Users,
        Target: Target,
        BarChart3: BarChart3,
        ShieldCheck: ShieldCheck,
        Megaphone: Megaphone,
        Handshake: Handshake,
        Mail: Mail,
        Phone: Phone,
        MapPin: MapPin,
        Zap: Zap
    };

    const getIcon = (iconName, className) => {
        const IconComponent = iconMap[iconName];
        return IconComponent ? <IconComponent className={className} /> : null;
    };

    return (
        <div className="min-h-screen ">
            {/* Hero Section */}
            <div className="relative bg-primary overflow-hidden">
                <div className="absolute inset-0 opacity-10 pattern-grid-lg"></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent font-medium text-sm mb-6">
                            <Zap className="w-4 h-4 mr-2" />
                            {advertiseData.hero.badge}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                            {advertiseData.hero.title} <span className="text-accent">{advertiseData.hero.titleHighlight}</span>
                        </h1>
                        <p className="text-xl text-gray-300 mb-10 leading-relaxed text-left">
                            {advertiseData.hero.description1}
                        </p>
                        <p className="text-xl text-gray-300 mb-10 leading-relaxed text-left">
                            {advertiseData.hero.description2}
                        </p>
                    </div>
                </div>

                {/* Abstract Shapes */}
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 opacity-10">
                    <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#C0934B" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.4,82.2,23.1,70.8,34.5C59.4,45.9,47.9,55,35.4,62.5C22.9,70,9.4,75.9,-3.3,81.6C-16,87.3,-30.2,92.8,-41.9,86.8C-53.6,80.8,-62.7,63.3,-69.8,48.8C-76.9,34.3,-82,22.8,-83.4,10.6C-84.8,-1.6,-82.5,-14.5,-74.9,-25.1C-67.3,-35.7,-54.4,-44,-41.8,-51.7C-29.2,-59.4,-16.9,-66.5,-2.8,-61.7C11.3,-56.9,22.6,-70,30.5,-83.6L44.7,-76.4Z" transform="translate(100 100)" />
                    </svg>
                </div>
            </div>

            {/* Why Advertise With Us */}
            <div className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 rounded-2xl p-8 md:p-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">{advertiseData.partnerships.title}</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                            {advertiseData.partnerships.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                        {advertiseData.partnerships.features.map((feature, idx) => (
                            <div key={idx} className="group p-8 rounded-2xl backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-100 hover:border-accent/20 hover:shadow-xl transition-all duration-300 w-full md:w-[calc(50%-2rem)] lg:w-[calc(33.33%-3rem)]">
                                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    {getIcon(feature.icon, "w-8 h-8 text-accent")}
                                </div>
                                <h3 className="text-xl font-bold text-primary mb-3">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Available Advertising Options */}
            <div className="py-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 rounded-2xl p-8 md:p-12">
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm mb-6">
                            <Zap className="w-4 h-4 mr-2" />
                            {advertiseData.options.badge}
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-primary mb-6">{advertiseData.options.title}</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                            {advertiseData.options.description}
                        </p>
                    </div>

                    <div className="space-y-24 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 rounded-2xl p-8 md:p-12">
                        {advertiseData.options.list.map((option, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.7, delay: idx * 0.1 }}
                                className={`flex flex-col ${option.align === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}
                            >
                                {/* Visual Side */}
                                <div className="w-full lg:w-1/2 flex justify-center ">
                                    <div className="relative w-full max-w-md aspect-[4/3] rounded-[3rem] overflow-hidden group">
                                        <div className={`absolute inset-0 ${option.color} opacity-10 blur-3xl transform scale-90 group-hover:scale-100 transition-transform duration-700`}></div>
                                        <div className={`relative h-full w-full ${option.color} rounded-[3rem] shadow-xl border-4 border-white flex items-center justify-center transform group-hover:rotate-1 transition-transform duration-500`}>
                                            <div className="absolute inset-0 bg-white/10 pattern-dots opacity-30"></div>
                                            <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-inner">
                                                {getIcon(option.icon, "w-16 h-16 text-white")}
                                            </div>

                                            {/* Decorative pill shape from reference */}
                                            <div className={`absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl`}></div>
                                            <div className={`absolute -top-12 -left-12 w-48 h-48 bg-black/5 rounded-full blur-2xl`}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Side */}
                                <div className="w-full lg:w-1/2">
                                    <h3 className="text-3xl md:text-4xl font-bold text-primary mb-8">{option.title}</h3>
                                    <div className="space-y-6">
                                        {option.points.map((point, pIdx) => (
                                            <div key={pIdx} className="flex items-start group">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mt-1 mr-4 group-hover:bg-accent group-hover:text-white transition-colors duration-300">
                                                    <CheckCircle2 className="w-5 h-5 text-accent group-hover:text-white transition-colors duration-300" />
                                                </div>
                                                <p className="text-lg text-gray-700 leading-relaxed">{point}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contact Form Section */}
            <div id="contact-form" className="py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="backdrop-blur supports-[backdrop-filter]:bg-primary/80 bg-primary/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
                        <div className="md:w-5/12 p-10 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-3xl font-bold mb-4">{advertiseData.contact.title}</h3>
                                <p className="text-gray-300 mb-8">
                                    {advertiseData.contact.description}
                                </p>
                                <div className="space-y-8">
                                    {advertiseData.contact.sections.map((section, idx) => (
                                        <div key={idx}>
                                            <div className="font-semibold text-accent mb-3">{section.title}</div>
                                            <div className="space-y-3">
                                                {section.description && <p className="text-gray-300 text-sm mb-2">{section.description}</p>}
                                                {section.details.map((detail, dIdx) => (
                                                    <div key={dIdx} className="flex items-start">
                                                        {detail.type === 'email' ? (
                                                            <Mail className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                                                        ) : (
                                                            <MapPin className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                                                        )}
                                                        <div className="text-gray-300 text-sm">
                                                            <div>{detail.label}</div>
                                                            {detail.link ? (
                                                                <a href={detail.link} className="text-white hover:text-accent transition-colors">{detail.value}</a>
                                                            ) : (
                                                                <div className="text-white">{detail.value}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 opacity-10 pointer-events-none">
                                <div className="w-64 h-64 rounded-full bg-accent blur-3xl"></div>
                            </div>
                        </div>

                        <div className="md:w-7/12 bg-white p-10 md:p-12">
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            required
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            required
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                                    <input
                                        type="text"
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        placeholder="Company Ltd"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Email</label>
                                    <input
                                        type="email"
                                        name="workEmail"
                                        required
                                        value={formData.workEmail}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                        placeholder="john@company.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">What are you interested in?</label>
                                    <select
                                        name="interest"
                                        value={formData.interest}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all bg-white"
                                    >
                                        <option value="Display Advertising">Display Advertising</option>
                                        <option value="Sponsored Content">Sponsored Content</option>
                                        <option value="Newsletter Sponsorship">Newsletter Sponsorship</option>
                                        <option value="Custom Partnership">Custom Partnership</option>
                                    </select>
                                </div>

                                {message && (
                                    <div className={`p-4 rounded-lg ${status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                        {message}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg transition-all shadow-lg hover:shadow-primary/20 disabled:opacity-70 flex justify-center items-center"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                    {loading ? 'Sending...' : 'Submit Inquiry'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Commitment to Integrity Section */}
            <div className="">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className=" backdrop-blur supports-[backdrop-filter]:bg-[#C0934B]/80 bg-[#C0934B]/80 rounded-2xl p-8 md:p-12 text-center text-white">
                        <h2 className="text-3xl font-bold mb-6">{advertiseData.integrity.title}</h2>
                        <p className="text-lg leading-relaxed max-w-4xl mx-auto">
                            {advertiseData.integrity.description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvertiseWithUs;