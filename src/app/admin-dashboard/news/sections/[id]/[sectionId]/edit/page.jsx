"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import CKEditor from "@/app/components/CKEditor";
import { FaRegTrashAlt, FaFacebookF, FaInstagram, FaYoutube, FaArrowLeft } from 'react-icons/fa';
import GlobalLoader from "@/app/components/GlobalLoader";

// Block types available
const blockTypes = [
    { type: "heading", label: "Heading", icon: "H" },
    { type: "paragraph", label: "Paragraph", icon: "P" },
    { type: "rich_text", label: "Rich Text", icon: "RT" },
    { type: "image", label: "Image", icon: "I" },
    { type: "table", label: "Table", icon: "T" },
    { type: "list", label: "List", icon: "L" },
    { type: "link", label: "Link", icon: "L" },
    { type: "quote", label: "Quote", icon: "Q" },
    { type: "footer", label: "Footer", icon: "F" }
];

export default function NewsEditSectionPage() {
    const router = useRouter();
    const params = useParams();
    const newsId = params.id;
    const sectionId = params.sectionId;

    const [newsItem, setNewsItem] = useState(null);
    const [sectionHeading, setSectionHeading] = useState("");
    const [contentBlocks, setContentBlocks] = useState([]);
    const [showBlockTypeMenu, setShowBlockTypeMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isUpdatingSection, setIsUpdatingSection] = useState(false);

    // Initial Fetch for Edit
    useEffect(() => {
        const fetchNewsAndSection = async () => {
            if (!newsId || !sectionId) return;

            try {
                // Fetch News to check for footers in other sections
                const newsResponse = await fetch(`/api/admin/news/${newsId}`);
                const newsData = await newsResponse.json();
                if (newsData.success) {
                    setNewsItem(newsData.article); // API returns 'article'
                }

                // Fetch the specific section
                const response = await fetch(`/api/admin/news/${newsId}/sections/${sectionId}`);
                const data = await response.json();

                if (data.success) {
                    const section = data.section;
                    setSectionHeading(section.heading);

                    // Map backend blocks to frontend format
                    const mappedBlocks = (section.contentBlocks || []).map(block => {
                        let content = block.content;

                        // Parse JSON content if it's stored as a string but represents an object
                        try {
                            if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
                                const parsed = JSON.parse(content);
                                if (typeof parsed === 'object') content = parsed;
                            }
                        } catch (e) {
                            // Keep as string if parsing fails
                        }

                        // Reconstruct specific block types based on schema fields
                        if (block.blockType === 'image') {
                            const imgContent = typeof content === 'object' ? content : {
                                mode: block.image ? 'upload' : 'url',
                                url: (typeof content === 'string' && content.startsWith('http')) ? content : '',
                                caption: (typeof content === 'string' && !content.startsWith('http')) ? content : '',
                                file: null
                            };

                            if (block.image) {
                                if (typeof block.image === 'string') {
                                    imgContent.mode = 'url';
                                    imgContent.url = block.image;
                                } else {
                                    imgContent.mode = 'upload';
                                    if (block.image.filename) {
                                        imgContent.previewUrl = `/api/admin/news/image/${block.image.filename}`;
                                        imgContent.originalImageMeta = block.image;
                                    }
                                }
                            }
                            content = imgContent;
                        } else if (block.blockType === 'list') {
                            if (block.listConfig) {
                                let customImagePreview = null;
                                let originalCustomImageMeta = null;

                                if (block.listConfig.customImage) {
                                    if (typeof block.listConfig.customImage === 'string') {
                                        customImagePreview = block.listConfig.customImage;
                                    } else {
                                        originalCustomImageMeta = block.listConfig.customImage;
                                        if (originalCustomImageMeta.filename) {
                                            customImagePreview = `/api/admin/news/image/${originalCustomImageMeta.filename}`;
                                        }
                                    }
                                }

                                content = {
                                    style: block.listConfig.type || 'disc',
                                    customSymbol: block.listConfig.customSymbol,
                                    customImage: customImagePreview,
                                    originalCustomImageMeta: originalCustomImageMeta,
                                    items: content
                                };
                            } else if (typeof content === 'string') {
                                content = { style: 'disc', items: content };
                            }
                        } else if (block.blockType === 'link') {
                            if (block.linkConfig) {
                                content = {
                                    url: block.linkConfig.url,
                                    text: block.linkConfig.text || block.content,
                                    target: block.linkConfig.target === '_blank' ? 'new' : 'same'
                                };
                            }
                        }

                        return {
                            id: block._id || Date.now() + Math.random(),
                            type: block.blockType === 'editor' ? 'rich_text' : block.blockType,
                            content: content
                        };
                    });

                    setContentBlocks(mappedBlocks);

                } else {
                    toast.error(data.error || "Failed to load section");
                    router.push(`/admin-dashboard/news/${newsId}`);
                }
            } catch (error) {
                console.error("Error fetching section:", error);
                toast.error("Error loading section");
            } finally {
                setLoading(false);
            }
        };

        fetchNewsAndSection();
    }, [newsId, sectionId, router]);


    // --- Editor Actions ---

    const handleAddBlock = (blockType) => {
        const newBlock = {
            id: Date.now(),
            type: blockType,
            content: ""
        };
        setContentBlocks([...contentBlocks, newBlock]);
        setShowBlockTypeMenu(false);
    };

    const handleRemoveBlock = (blockId) => {
        setContentBlocks(contentBlocks.filter(block => block.id !== blockId));
    };

    const handleBlockContentChange = (blockId, content) => {
        setContentBlocks(contentBlocks.map(block =>
            block.id === blockId ? { ...block, content } : block
        ));
    };

    // --- Upload Helper ---
    const uploadImageFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/news/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Image upload failed");
        return {
            filename: data.filename,
            contentType: data.contentType,
            gridfsId: data.gridfsId,
            size: data.size
        };
    };

    // Handle update section (Submit Logic)
    const handleUpdateSection = async () => {
        if (!sectionHeading.trim() && contentBlocks.length === 0) {
            toast.error("Please add a heading or content blocks");
            return;
        }

        setIsUpdatingSection(true);
        try {
            const processedBlocks = await Promise.all(contentBlocks.map(async (block, index) => {
                const processed = {
                    blockType: block.type === 'rich_text' ? 'editor' : block.type,
                    content: '',
                    image: null,
                    listConfig: null,
                    linkConfig: null,
                    order: index
                };

                if (block.type === 'image') {
                    const imgData = typeof block.content === 'object' ? block.content : {};
                    processed.content = imgData.caption || '';

                    if (imgData.mode === 'upload' && imgData.file && imgData.file.startsWith('data:')) {
                        const fetchBlob = await fetch(imgData.file);
                        const blob = await fetchBlob.blob();
                        const file = new File([blob], "image.png", { type: blob.type });

                        const uploadMeta = await uploadImageFile(file);
                        processed.image = uploadMeta;
                    } else if (imgData.mode === 'upload') {
                        if (imgData.originalImageMeta) {
                            processed.image = imgData.originalImageMeta;
                        }
                    } else if (imgData.mode === 'url') {
                        processed.content = imgData.url;
                    }
                }
                else if (block.type === 'list') {
                    const listData = typeof block.content === 'object' ? block.content : {};
                    let customImageMeta = null;
                    if (listData.style === 'custom' && listData.customImage) {
                        if (typeof listData.customImage === 'string' && listData.customImage.startsWith('data:')) {
                            const fetchBlob = await fetch(listData.customImage);
                            const blob = await fetchBlob.blob();
                            const file = new File([blob], "bullet.png", { type: blob.type });
                            customImageMeta = await uploadImageFile(file);
                        } else {
                            if (listData.originalCustomImageMeta) {
                                customImageMeta = listData.originalCustomImageMeta;
                            }
                        }
                    }

                    processed.listConfig = {
                        type: listData.style || 'disc',
                        customSymbol: listData.customSymbol,
                        customImage: customImageMeta
                    };
                    processed.content = listData.items || '';
                }
                else if (block.type === 'link') {
                    const linkData = typeof block.content === 'object' ? block.content : {};
                    processed.linkConfig = {
                        url: linkData.url,
                        text: linkData.text,
                        target: (linkData.target === 'new') ? '_blank' : '_self'
                    };
                    processed.content = linkData.text || '';
                }
                else if (block.type === 'table' || block.type === 'footer') {
                    if (typeof block.content === 'object') {
                        processed.content = JSON.stringify(block.content);
                    } else {
                        processed.content = block.content;
                    }
                }
                else {
                    processed.content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
                }

                return processed;
            }));

            // API Call - PUT
            const response = await fetch(`/api/admin/news/${newsId}/sections/${sectionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    heading: sectionHeading,
                    contentBlocks: processedBlocks
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Section updated successfully!");
                router.push(`/admin-dashboard/news/${newsId}`);
            } else {
                toast.error(data.error || "Failed to update section");
            }

        } catch (error) {
            console.error("Error updating section:", error);
            toast.error("An error occurred: " + error.message);
        } finally {
            setIsUpdatingSection(false);
        }
    };


    const handleBack = () => {
        router.push(`/admin-dashboard/news/${newsId}`);
    };

    if (loading) return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
    if (!newsItem) return null;

    return (
        <div className="max-w-7xl mx-auto pb-10 px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1E4032]">{newsItem.mainHeading}</h1>
                    <p className="text-gray-500">Edit Section</p>
                </div>
                <button
                    onClick={handleBack}
                    className="px-4 py-2 bg-white border border-[#C0934B] text-[#C0934B] rounded-lg hover:bg-[#C0934B] hover:text-white transition-colors flex items-center gap-2 font-bold"
                >
                    <FaArrowLeft className="w-3 h-3" /> Back to News
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Editor */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 relative shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Content</h2>

                    <div className="relative">
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 font-bold">Section Heading</label>
                            <input
                                type="text"
                                value={sectionHeading}
                                onChange={(e) => setSectionHeading(e.target.value)}
                                placeholder="Enter section heading..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] transition-all"
                                disabled={isUpdatingSection}
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 font-bold">Content Blocks</label>
                            <div className="border border-gray-300 rounded-xl p-4 min-h-[300px] relative bg-gray-50/30">
                                <div className="space-y-4 pb-12">
                                    {contentBlocks.length === 0 ? (
                                        <div className="text-center py-20 text-gray-400 italic">No blocks added yet. Click the + button to add content.</div>
                                    ) : (
                                        contentBlocks.map((block, index) => (
                                            <ContentBlockEditor
                                                key={block.id}
                                                block={block}
                                                index={index}
                                                onContentChange={handleBlockContentChange}
                                                onRemove={handleRemoveBlock}
                                                disabled={isUpdatingSection}
                                            />
                                        ))
                                    )}
                                </div>

                                {/* Add Block Button */}
                                <div className="absolute bottom-4 right-4">
                                    <button
                                        onClick={() => setShowBlockTypeMenu(!showBlockTypeMenu)}
                                        disabled={isUpdatingSection}
                                        className={`w-12 h-12 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-full text-white transition-all shadow-lg hover:scale-105 active:scale-95 ${isUpdatingSection ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="text-3xl font-bold">+</span>
                                    </button>
                                    {showBlockTypeMenu && (
                                        <div className="absolute bottom-14 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 w-56 z-50 animate-in fade-in zoom-in duration-200">
                                            <div className="text-[10px] font-black text-gray-400 px-3 py-2 uppercase tracking-widest border-b border-gray-100 mb-1">Select Block Type</div>
                                            {blockTypes.map(bt => {
                                                const isFooter = bt.type === 'footer';
                                                const existsInOther = newsItem?.sections?.some(s => s._id !== sectionId && s.contentBlocks?.some(b => b.blockType === 'footer' || b.type === 'footer'));
                                                const existsInCurrent = contentBlocks.some(b => b.type === 'footer');
                                                const disabled = isFooter && (existsInOther || existsInCurrent);

                                                return (
                                                    <button
                                                        key={bt.type}
                                                        onClick={() => !disabled && handleAddBlock(bt.type)}
                                                        className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-[#FDF5E6] hover:text-[#C0934B]'}`}
                                                        title={disabled ? (existsInOther ? "Footer already exists in another section" : "Footer already added") : ""}
                                                    >
                                                        <span className="font-bold w-6 text-center text-lg">{bt.icon}</span>
                                                        <span className="text-sm font-medium">{bt.label}</span>
                                                        {disabled && <span className="text-[8px] font-black text-red-500 ml-auto uppercase opacity-60">Exists</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={handleUpdateSection}
                                disabled={isUpdatingSection}
                                className={`flex-[2] px-4 py-3.5 bg-[#C0934B] text-white rounded-xl hover:bg-[#a17a3e] transition-all font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${isUpdatingSection ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isUpdatingSection ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        SAVING CHANGES...
                                    </>
                                ) : "SAVE SECTION CHANGES"}
                            </button>
                            <button
                                onClick={handleBack}
                                disabled={isUpdatingSection}
                                className="flex-1 px-4 py-3.5 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm uppercase tracking-wider disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Preview */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 relative shadow-sm h-fit sticky top-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 text-sm uppercase tracking-widest text-[#C0934B]">Live Preview</h2>
                        <div className="flex gap-1.5 focus-within:ring-2 ring-[#C0934B] rounded-full p-1 bg-gray-50">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                        </div>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-8 min-h-[500px] bg-[#FAFAFA]">
                        <div className="max-w-xl mx-auto space-y-6">
                            {sectionHeading && (
                                <h3 className="text-3xl font-bold text-gray-900 border-b-4 border-[#C0934B] pb-4 inline-block">
                                    {sectionHeading}
                                </h3>
                            )}
                            {contentBlocks.map(block => (
                                <ContentBlockPreview key={block.id} block={block} />
                            ))}
                            {(!sectionHeading && contentBlocks.length === 0) && (
                                <div className="flex items-center justify-center h-[300px] text-gray-300 italic text-sm">Preview window...</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Loader Overlay */}
            {isUpdatingSection && <div className="fixed inset-0 z-[9999] bg-white/50 backdrop-blur-[2px]"><GlobalLoader /></div>}
        </div>
    );
}

// --- Helper Components ---

function ContentBlockEditor({ block, index, onContentChange, onRemove, disabled }) {

    const renderBlockContent = () => {
        switch (block.type) {
            case 'heading':
                return (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Title</label>
                        <input type="text" value={typeof block.content === 'string' ? block.content : ''} onChange={(e) => onContentChange(block.id, e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-[#C0934B] outline-none" placeholder="Heading Text" disabled={disabled} />
                    </div>
                );
            case 'paragraph':
                return (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Content</label>
                        <textarea value={typeof block.content === 'string' ? block.content : ''} onChange={(e) => onContentChange(block.id, e.target.value)} rows={6} className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#C0934B] outline-none leading-relaxed" placeholder="Write your paragraph... Use *bold* for bold text." disabled={disabled} />
                    </div>
                );
            case 'rich_text':
                return (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Advanced Editor</label>
                        <CKEditor value={typeof block.content === 'string' ? block.content : ''} onChange={(data) => onContentChange(block.id, data)} disabled={disabled} />
                    </div>
                );
            case 'image':
                const imageData = typeof block.content === 'object' ? block.content : { mode: 'upload', url: '', file: '', caption: '' };
                const handleImageChange = (f, v) => onContentChange(block.id, { ...imageData, [f]: v });
                return (
                    <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        <div className="flex gap-4">
                            <button onClick={() => handleImageChange('mode', 'upload')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${imageData.mode === 'upload' ? 'bg-[#C0934B] text-white shadow-sm' : 'bg-white text-gray-400 border border-gray-200'}`}>UPLOAD</button>
                            <button onClick={() => handleImageChange('mode', 'url')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${imageData.mode === 'url' ? 'bg-[#C0934B] text-white shadow-sm' : 'bg-white text-gray-400 border border-gray-200'}`}>LINK</button>
                        </div>

                        {imageData.mode === 'upload' ? (
                            <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center bg-white group-hover:border-[#C0934B] transition-colors relative">
                                <input type="file" accept="image/*" className="hidden" id={`img-${block.id}`} onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => handleImageChange('file', reader.result);
                                        reader.readAsDataURL(file);
                                    }
                                }} disabled={disabled} />
                                <label htmlFor={`img-${block.id}`} className={`cursor-pointer flex flex-col items-center group/lab ${disabled ? 'opacity-50' : ''}`}>
                                    <span className="text-sm font-bold text-[#C0934B] group-hover/lab:underline">Upload New Asset</span>
                                    <span className="text-[10px] text-gray-400 mt-1">JPG, PNG, WebP (Max 5MB)</span>
                                </label>

                                {(imageData.file || imageData.previewUrl) && (
                                    <div className="mt-4 relative inline-block group/img">
                                        <img src={imageData.file || imageData.previewUrl} className="h-40 object-contain rounded-lg border border-gray-100 shadow-xl" />
                                        <button onClick={(e) => { e.preventDefault(); handleImageChange('file', ''); handleImageChange('previewUrl', ''); }} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover/img:opacity-100" disabled={disabled}>
                                            <FaRegTrashAlt size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <input type="text" value={imageData.url} onChange={(e) => handleImageChange('url', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-[#C0934B] outline-none text-sm font-medium" placeholder="https://example.com/asset.jpg" disabled={disabled} />
                        )}
                        <input type="text" value={imageData.caption} onChange={(e) => handleImageChange('caption', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-[#C0934B] outline-none text-sm" placeholder="Enter caption..." disabled={disabled} />
                    </div>
                );
            case 'list':
                const listData = typeof block.content === 'object' ? block.content : { style: 'disc', items: '', customSymbol: '', customImage: '' };
                const updateList = (f, v) => onContentChange(block.id, { ...listData, [f]: v });
                return (
                    <div className="space-y-4">
                        <select value={listData.style} onChange={(e) => updateList('style', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:ring-1 focus:ring-[#C0934B] outline-none" disabled={disabled}>
                            <option value="disc">Disc (•)</option>
                            <option value="circle">Circle (○)</option>
                            <option value="square">Square (■)</option>
                            <option value="decimal">Number (1, 2, 3)</option>
                            <option value="lower-alpha">Alpha (a, b, c)</option>
                            <option value="upper-alpha">Alpha (A, B, C)</option>
                            <option value="lower-roman">Roman (i, ii, iii)</option>
                            <option value="upper-roman">Roman (I, II, III)</option>
                            <option value="custom">Custom Icon</option>
                        </select>

                        {listData.style === 'custom' && (
                            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-4">
                                <div className="flex gap-4 items-center">
                                    <input type="text" value={listData.customSymbol || ''} onChange={(e) => updateList('customSymbol', e.target.value)} className="flex-[2] border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-[#C0934B] outline-none" placeholder="Symbol (e.g. →)" disabled={disabled} />
                                    <div className="flex-1">
                                        <input type="file" accept="image/*" id={`list-icon-${block.id}`} hidden onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => updateList('customImage', reader.result);
                                                reader.readAsDataURL(file);
                                            }
                                        }} disabled={disabled} />
                                        <label htmlFor={`list-icon-${block.id}`} className={`block text-center bg-white border border-gray-300 px-3 py-2 rounded-lg text-[10px] font-black uppercase cursor-pointer hover:bg-gray-50 tracking-wider ${disabled ? 'opacity-50' : ''}`}>Icon</label>
                                    </div>
                                </div>
                                {listData.customImage && (
                                    <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100">
                                        <img src={listData.customImage} className="w-8 h-8 object-contain border border-gray-100 rounded bg-gray-50" />
                                        <button onClick={() => updateList('customImage', '')} className="text-[10px] font-black text-red-500 uppercase hover:underline" disabled={disabled}>Remove Icon</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <textarea value={listData.items} onChange={(e) => updateList('items', e.target.value)} rows={6} className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm leading-relaxed focus:ring-1 focus:ring-[#C0934B] outline-none" placeholder="Enter list items (one per line)..." disabled={disabled} />
                    </div>
                );
            case 'table':
                const tbl = typeof block.content === 'object' ? block.content : { rows: 3, cols: 3, data: [] };
                const updateTbl = (newData) => onContentChange(block.id, { ...tbl, ...newData });

                const handleGen = () => {
                    const rCount = parseInt(tbl.rows) || 1;
                    const cCount = parseInt(tbl.cols) || 1;
                    const newData = Array.from({ length: rCount }, (_, ri) =>
                        Array.from({ length: cCount }, (_, ci) => (tbl.data?.[ri]?.[ci]) || "")
                    );
                    updateTbl({ data: newData });
                };

                const editCell = (ri, ci, val) => {
                    const newData = [...tbl.data];
                    newData[ri] = [...newData[ri]];
                    newData[ri][ci] = val;
                    updateTbl({ data: newData });
                };

                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Row</label>
                                <input type="number" value={tbl.rows} onChange={e => updateTbl({ rows: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#C0934B] outline-none" min="1" disabled={disabled} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Col</label>
                                <input type="number" value={tbl.cols} onChange={e => updateTbl({ cols: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#C0934B] outline-none" min="1" disabled={disabled} />
                            </div>
                            <button onClick={handleGen} className="col-span-2 bg-gray-900 text-white py-3 rounded-lg text-xs font-black tracking-[0.2em] hover:bg-black transition-all shadow-md active:scale-95" disabled={disabled}>SYNC DIMENSIONS</button>
                        </div>

                        {tbl.data?.length > 0 && (
                            <div className="overflow-x-auto border border-gray-200 rounded-xl p-4 bg-white shadow-inner">
                                <div className="space-y-2 inline-block min-w-full">
                                    {tbl.data.map((row, ri) => (
                                        <div key={ri} className="flex gap-2 mb-1">
                                            {row.map((cell, ci) => (
                                                <input
                                                    key={ci}
                                                    value={cell}
                                                    onChange={e => editCell(ri, ci, e.target.value)}
                                                    className={`border rounded px-4 py-2.5 text-xs w-40 min-w-[120px] focus:ring-1 focus:ring-[#C0934B] outline-none transition-shadow ${ri === 0 ? 'bg-[#D2B48C] font-black border-[#C0934B] placeholder-gray-900/40 shadow-sm' : 'border-gray-200'}`}
                                                    placeholder={ri === 0 ? `HEADER ${ci + 1}` : ""}
                                                    disabled={disabled}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'link':
                const lData = typeof block.content === 'object' ? block.content : { url: '', text: '', target: 'same' };
                const updateLink = (f, v) => onContentChange(block.id, { ...lData, [f]: v });
                return (
                    <div className="flex flex-col gap-4 bg-[#FDF5E6]/30 p-5 rounded-xl border border-[#C0934B]/10">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Display Text</label>
                            <input type="text" value={lData.text} onChange={e => updateLink('text', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-[#C0934B] outline-none font-bold text-[#1E4032]" placeholder="e.g. Read Case Study" disabled={disabled} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Destination URL</label>
                            <input type="text" value={lData.url} onChange={e => updateLink('url', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-[#C0934B] outline-none font-mono" placeholder="https://..." disabled={disabled} />
                        </div>
                        <select value={lData.target} onChange={e => updateLink('target', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-[#C0934B] outline-none bg-white" disabled={disabled}>
                            <option value="same">Current Window</option>
                            <option value="new">New Tab (Recommended)</option>
                        </select>
                    </div>
                );
            case 'quote':
                return (
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Quote Source/Text</label>
                        <textarea value={typeof block.content === 'string' ? block.content : ''} onChange={e => onContentChange(block.id, e.target.value)} rows={4} className="w-full border border-[#C0934B]/30 rounded-xl px-5 py-4 focus:ring-2 focus:ring-[#C0934B] outline-none italic text-gray-700 bg-[#FDF5E6]/30" placeholder="Enter quote..." disabled={disabled} />
                    </div>
                );
            case 'footer':
                const fData = typeof block.content === 'object' ? block.content : { author: '', facebook: '', instagram: '', youtube: '', subscribeUrl: '', copyright: '' };
                const upFooter = (f, v) => onContentChange(block.id, { ...fData, [f]: v });
                return (
                    <div className="space-y-5 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Primary Author</label>
                            <input type="text" value={fData.author} onChange={e => upFooter('author', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#C0934B] outline-none font-bold" placeholder="Full Name" disabled={disabled} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Facebook</label><input type="text" value={fData.facebook} onChange={e => upFooter('facebook', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1" placeholder="URL" disabled={disabled} /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Instagram</label><input type="text" value={fData.instagram} onChange={e => upFooter('instagram', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1" placeholder="URL" disabled={disabled} /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-red-500 uppercase tracking-widest">YouTube</label><input type="text" value={fData.youtube} onChange={e => upFooter('youtube', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1" placeholder="URL" disabled={disabled} /></div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Newsletter Anchor (URL)</label>
                            <input type="text" value={fData.subscribeUrl} onChange={e => upFooter('subscribeUrl', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1" placeholder="https://..." disabled={disabled} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Copyright Disclaimer</label>
                            <input type="text" value={fData.copyright} onChange={e => upFooter('copyright', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-xs" placeholder="© 2025 Rupie Times" disabled={disabled} />
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="bg-white border-l-4 border-[#C0934B] rounded-xl shadow-md overflow-hidden border border-gray-200 group/block hover:shadow-lg transition-all duration-300">
            <div className="bg-gray-50/80 px-5 py-3 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center bg-[#C0934B] text-white w-7 h-7 rounded-full text-[12px] font-black shadow-sm">{index + 1}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{block.type === 'rich_text' ? 'EDITOR' : block.type}</span>
                </div>
                <button onClick={() => onRemove(block.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all disabled:opacity-30" disabled={disabled}>
                    <FaRegTrashAlt size={16} />
                </button>
            </div>
            <div className="p-6">
                {renderBlockContent()}
            </div>
        </div>
    );
}

function parseStyledText(text) {
    if (!text) return null;
    if (typeof text !== 'string') return text;
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
        const parts = line.split(/(\*.*?\*)/g);
        return (
            <span key={lineIdx} className="block min-h-[1.5em]">
                {parts.map((part, pIdx) => {
                    if (part.startsWith('*') && part.endsWith('*')) {
                        return <strong key={pIdx} className="font-bold">{part.slice(1, -1)}</strong>;
                    }
                    return part;
                })}
            </span>
        );
    });
}

function ContentBlockPreview({ block }) {
    if (!block.content && block.type !== 'image' && block.type !== 'footer') return null;

    if (block.type === 'rich_text') return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: block.content }} />;
    if (block.type === 'heading') return <h4 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{parseStyledText(block.content)}</h4>;
    if (block.type === 'paragraph') return <div className="text-gray-700 leading-relaxed text-base">{parseStyledText(block.content)}</div>;
    if (block.type === 'quote') return <blockquote className="border-l-[6px] border-[#C0934B] pl-5 italic text-gray-700 text-lg py-2 my-8 bg-gray-50/50 rounded-r-lg">{parseStyledText(block.content)}</blockquote>;

    if (block.type === 'image') {
        const img = typeof block.content === 'object' ? block.content : { url: block.content };
        const url = img.mode === 'upload' ? (img.file || img.previewUrl) : img.url;
        if (!url) return null;
        return (
            <figure className="my-8">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100 ring-4 ring-white/50">
                    <img src={url} className="w-full h-auto object-cover" alt={img.caption || 'Preview'} />
                </div>
                {img.caption && <figcaption className="text-center text-xs text-gray-400 mt-4 italic font-medium px-10 leading-relaxed">{img.caption}</figcaption>}
            </figure>
        );
    }

    if (block.type === 'list') {
        const data = typeof block.content === 'object' ? block.content : { items: block.content, style: 'disc' };
        const items = (data.items || '').split('\n').filter(i => i.trim());
        if (data.style === 'custom') {
            return (
                <ul className="space-y-4 my-6">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-4 text-gray-700">
                            {data.customImage ? (
                                <img src={data.customImage} alt="icon" className="w-5 h-5 object-contain mt-1 shadow-sm" />
                            ) : (
                                <span className="text-[#C0934B] font-black mt-1 leading-none">{data.customSymbol || '•'}</span>
                            )}
                            <span className="leading-relaxed">{parseStyledText(item)}</span>
                        </li>
                    ))}
                </ul>
            );
        }
        const listStyleMap = { 'bullet': 'disc', 'disc': 'disc', 'circle': 'circle', 'square': 'square', 'number': 'decimal', 'decimal': 'decimal', 'lower-alpha': 'lower-alpha', 'upper-alpha': 'upper-alpha', 'lower-roman': 'lower-roman', 'upper-roman': 'upper-roman' };
        return <ul style={{ listStyleType: listStyleMap[data.style] || data.style || 'disc' }} className="pl-8 space-y-3 my-6 text-gray-700 list-outside text-base leading-relaxed">{items.map((item, i) => <li key={i}>{parseStyledText(item)}</li>)}</ul>;
    }

    if (block.type === 'link') {
        const link = typeof block.content === 'object' ? block.content : { url: block.content, text: 'Review Web Link', target: 'same' };
        return (
            <a href={link.url} target={link.target === 'new' ? '_blank' : '_self'} className="inline-flex items-center gap-2 text-[#C0934B] font-bold hover:underline py-3 my-4 text-xl group transition-all" onClick={e => e.stopPropagation()}>
                {link.text || 'Review Web Link'} <span className="group-hover:translate-x-1 transition-transform text-sm opacity-60">↗</span>
            </a>
        );
    }

    if (block.type === 'table') {
        let tData = block.content;
        if (typeof tData === 'string') { try { tData = JSON.parse(tData); } catch (e) { return null; } }
        if (!tData?.data?.length) return null;
        return (
            <div className="overflow-x-auto my-10 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                    <tbody>
                        {tData.data.map((row, ri) => (
                            <tr key={ri} className={ri === 0 ? "bg-[#D2B48C] font-black text-gray-900" : "border-b border-gray-50 hover:bg-gray-50/50 transition-colors"}>
                                {row.map((cell, ci) => (
                                    <td key={ci} className="px-6 py-5 border-r border-gray-50/50 last:border-r-0">{parseStyledText(cell)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (block.type === 'footer') {
        const foot = (typeof block.content === 'object') ? block.content : {};

        return (
            <div className="rounded-[15px] border-[0.5px] border-gray-300 overflow-hidden my-4 font-sans bg-white shadow-sm mt-12">
                <div className="bg-[#C0934B] py-4 flex justify-center gap-6 text-white text-lg">
                    {foot.facebook && <FaFacebookF className="hover:scale-110 transition-transform cursor-pointer" />}
                    {foot.instagram && <FaInstagram className="hover:scale-110 transition-transform cursor-pointer" />}
                    {foot.youtube && <FaYoutube className="hover:scale-110 transition-transform cursor-pointer" />}
                    {(!foot.facebook && !foot.instagram && !foot.youtube) && (
                        <div className="flex gap-6 opacity-30">
                            <FaFacebookF /> <FaInstagram /> <FaYoutube />
                        </div>
                    )}
                </div>

                <div className="p-6 text-center text-black">
                    <p className="mb-2 text-sm text-gray-900 font-medium">
                        Written By <span className="underline font-bold">{foot.author || 'Author Name'}</span>
                    </p>

                    {foot.subscribeUrl && (
                        <p className="mb-4 text-xs text-gray-900 font-medium">
                            Subscribe for more updates <span className="underline font-bold">Join Now.</span>
                        </p>
                    )}

                    <div className="border-t border-gray-100 w-full pt-4 text-[10px] font-bold text-[#00301F]">
                        {foot.copyright || `© ${new Date().getFullYear()} Rupie Times. All rights reserved.`}
                    </div>
                </div>
            </div>
        );
    }
    return <div className="text-gray-400 italic text-sm">{JSON.stringify(block.content)}</div>;
}
