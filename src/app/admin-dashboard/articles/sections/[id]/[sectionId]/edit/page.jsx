"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import CKEditor from "@/app/components/CKEditor";
import { FaFacebookF, FaInstagram, FaYoutube, FaRegTrashAlt } from 'react-icons/fa';
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

export default function FreeArticleEditSectionPage() {
    const router = useRouter();
    const params = useParams();
    // For Free Article: id is articleId, sectionId is sectionId
    const articleId = params.id;
    const sectionId = params.sectionId;

    const [article, setArticle] = useState(null);
    const [sectionHeading, setSectionHeading] = useState("");
    const [contentBlocks, setContentBlocks] = useState([]);
    const [showBlockTypeMenu, setShowBlockTypeMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isUpdatingSection, setIsUpdatingSection] = useState(false);

    // Initial Fetch for Edit
    useEffect(() => {
        const fetchArticleAndSection = async () => {
            if (!articleId || !sectionId) return;

            try {
                // Fetch Article to check for footers in other sections
                const articleResponse = await fetch(`/api/admin/articles/${articleId}`);
                const articleData = await articleResponse.json();
                if (articleData.success) {
                    setArticle(articleData.article);
                }

                // Fetch the specific section
                const response = await fetch(`/api/admin/articles/${articleId}/sections/${sectionId}`);
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
                                    // Construct a preview URL for the existing image
                                    // Using the generic image endpoint or just handling raw data if needed.
                                    // Assuming there's a file serve endpoint or we construct similar to Product.
                                    // For Free articles, we used to just upload. Let's assume we can fetch by ID or similar.
                                    // Ideally: /api/admin/files/[filename] but standardizing.
                                    // We'll use the filename directly if it works on frontend, or a placeholder.
                                    // Actually, let's use the pattern from View Page for safe URL.
                                    if (block.image.filename) {
                                        // Use the specific API for free articles
                                        imgContent.previewUrl = `/api/admin/articles/image/${block.image.filename}`;
                                        imgContent.originalImageMeta = block.image;
                                    }
                                }
                            }
                            content = imgContent;
                        } else if (block.blockType === 'list') {
                            // Reconstruct from block.listConfig if available
                            if (block.listConfig) {
                                let customImagePreview = null;
                                let originalCustomImageMeta = null;

                                if (block.listConfig.customImage) {
                                    if (typeof block.listConfig.customImage === 'string') {
                                        customImagePreview = block.listConfig.customImage;
                                    } else {
                                        // Metadata object
                                        originalCustomImageMeta = block.listConfig.customImage;
                                    }
                                }

                                content = {
                                    style: block.listConfig.type === 'bullet' ? 'disc' : (block.listConfig.type === 'number' ? 'decimal' : 'custom'),
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
                                    text: content,
                                    target: block.linkConfig.target === '_self' ? 'same' : 'new'
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
                    router.push(`/admin-dashboard/articles/view/${articleId}`);
                }
            } catch (error) {
                console.error("Error fetching section:", error);
                toast.error("Error loading section");
            } finally {
                setLoading(false);
            }
        };

        fetchArticleAndSection();
    }, [articleId, sectionId, router]);


    // --- Editor Actions ---

    // Add content block
    const handleAddBlock = (blockType) => {
        const newBlock = {
            id: Date.now(),
            type: blockType,
            content: ""
        };
        setContentBlocks([...contentBlocks, newBlock]);
        setShowBlockTypeMenu(false);
    };

    // Remove content block
    const handleRemoveBlock = (blockId) => {
        setContentBlocks(contentBlocks.filter(block => block.id !== blockId));
    };

    // Update block content
    const handleBlockContentChange = (blockId, content) => {
        setContentBlocks(contentBlocks.map(block =>
            block.id === blockId ? { ...block, content } : block
        ));
    };

    // --- Upload Helper ---
    const uploadImageFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'content');

        const res = await fetch('/api/admin/articles/upload', {
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
            // Processing blocks
            const processedBlocks = await Promise.all(contentBlocks.map(async (block, index) => {
                const processed = {
                    blockType: block.type === 'rich_text' ? 'editor' : block.type,
                    content: '',
                    image: null,
                    listConfig: null,
                    linkConfig: null,
                    order: index
                };

                // Handle different types
                if (block.type === 'image') {
                    const imgData = typeof block.content === 'object' ? block.content : {};
                    processed.content = imgData.caption || '';

                    if (imgData.mode === 'upload' && imgData.file) {
                        // New file upload
                        const fetchBlob = await fetch(imgData.file);
                        const blob = await fetchBlob.blob();
                        const file = new File([blob], "image.png", { type: blob.type });

                        const uploadMeta = await uploadImageFile(file);
                        processed.image = uploadMeta;
                    } else if (imgData.mode === 'upload') {
                        // Existing image meta logic
                        if (imgData.originalImageMeta) {
                            processed.image = imgData.originalImageMeta;
                        }
                    }
                }
                else if (block.type === 'list') {
                    const listData = typeof block.content === 'object' ? block.content : {};
                    let customImageMeta = null;
                    if (listData.style === 'custom' && listData.customImage) {
                        if (typeof listData.customImage === 'string' && listData.customImage.startsWith('data:')) {
                            // New upload
                            const fetchBlob = await fetch(listData.customImage);
                            const blob = await fetchBlob.blob();
                            const file = new File([blob], "bullet.png", { type: blob.type });
                            customImageMeta = await uploadImageFile(file);
                        } else {
                            // Existing
                            if (listData.originalCustomImageMeta) {
                                customImageMeta = listData.originalCustomImageMeta;
                            }
                        }
                    }

                    processed.listConfig = {
                        type: listData.style === 'disc' ? 'bullet' : (listData.style === 'decimal' ? 'number' : 'custom'),
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
                else if (block.type === 'table') {
                    if (typeof block.content === 'object') {
                        processed.content = JSON.stringify(block.content);
                    } else {
                        processed.content = block.content;
                    }
                }
                else if (block.type === 'footer') {
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
            const response = await fetch(`/api/admin/articles/${articleId}/sections/${sectionId}`, {
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
                // Redirect back to preview
                router.push(`/admin-dashboard/articles/view/${articleId}`);
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
        router.push(`/admin-dashboard/articles/view/${articleId}`);
    };

    if (loading) return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <span onClick={() => router.push(`/admin-dashboard/articles`)} className="cursor-pointer hover:underline">Articles</span>
                        <span>&gt;</span>
                        <span onClick={() => router.push(`/admin-dashboard/articles/view/${articleId}`)} className="cursor-pointer hover:underline">Article Preview</span>
                        <span>&gt;</span>
                        <span className="text-[#C0934B] font-medium">Edit Section</span>
                    </nav>
                    <h1 className="text-2xl font-bold text-[#1E4032]">Edit Article Section</h1>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleBack} className="px-4 py-2 bg-white border border-[#C0934B] text-[#C0934B] rounded-lg hover:bg-[#C0934B] hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleUpdateSection} className="px-6 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors font-medium">
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Editor */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 relative">

                    <div className="relative">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Section Heading <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                value={sectionHeading}
                                onChange={(e) => setSectionHeading(e.target.value)}
                                placeholder="Enter updated section heading..."
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]"
                                disabled={isUpdatingSection}
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Content Blocks</label>
                            <div className="border border-gray-300 rounded-lg p-4 min-h-[200px] relative">
                                <div className="space-y-3 pb-8">
                                    {contentBlocks.map(block => (
                                        <ContentBlockEditor
                                            key={block.id}
                                            block={block}
                                            onContentChange={handleBlockContentChange}
                                            onRemove={handleRemoveBlock}
                                            disabled={isUpdatingSection}
                                        />
                                    ))}
                                </div>

                                {/* Add Block Button */}
                                <div className="absolute bottom-2 right-2">
                                    <button
                                        onClick={() => setShowBlockTypeMenu(!showBlockTypeMenu)}
                                        disabled={isUpdatingSection}
                                        className="w-10 h-10 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-md disabled:opacity-50"
                                    >
                                        <span className="text-white text-2xl font-bold">+</span>
                                    </button>
                                    {showBlockTypeMenu && (
                                        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-48 z-10">
                                            <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">Select Block Type</div>
                                            {blockTypes.map(bt => {
                                                const isFooter = bt.type === 'footer';
                                                const existsInOtherSections = article?.sections?.some(s => s._id !== sectionId && s.contentBlocks?.some(b => b.blockType === 'footer' || b.type === 'footer'));
                                                const existsInCurrentBlocks = contentBlocks.some(b => b.type === 'footer');
                                                const disabled = isFooter && (existsInOtherSections || existsInCurrentBlocks);

                                                return (
                                                    <button
                                                        key={bt.type}
                                                        onClick={() => !disabled && handleAddBlock(bt.type)}
                                                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-gray-100'}`}
                                                        title={disabled ? (existsInOtherSections ? "Footer already exists in another section" : "Footer already added to this section") : ""}
                                                    >
                                                        <span className="font-bold w-6">{bt.icon}</span>
                                                        <span className="text-sm text-gray-700">{bt.label}</span>
                                                        {disabled && <span className="text-[10px] text-red-500 ml-auto">Exists</span>}
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
                                className="flex-1 px-4 py-2.5 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isUpdatingSection ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Updating...
                                    </>
                                ) : "Update Section"}
                            </button>
                            <button
                                onClick={() => router.push(`/admin-dashboard/articles/view/${articleId}`)}
                                disabled={isUpdatingSection}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Preview */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 relative">

                    <h2 className="text-xl font-bold text-gray-900 mb-4">Live Preview</h2>
                    <div className="border border-gray-200 rounded-lg p-6 min-h-[400px]">
                        <div className="space-y-4">
                            {sectionHeading && <h3 className="text-2xl font-bold text-gray-900">{sectionHeading}</h3>}
                            {contentBlocks.map(block => (
                                <ContentBlockPreview key={block.id} block={block} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Screen Loader */}
            {isUpdatingSection && (
                <div className="fixed inset-0 z-[9999]">
                    <GlobalLoader />
                </div>
            )}
        </div>
    );
}

// --- Helper Components ---

function ContentBlockEditor({ block, onContentChange, onRemove, disabled }) {
    const [linkData, setLinkData] = useState(() => {
        if (block.type === 'link' && typeof block.content === 'object') return block.content;
        return { url: '', text: '', target: 'same' };
    });

    const handleLinkChange = (field, value) => {
        const newLinkData = { ...linkData, [field]: value };
        setLinkData(newLinkData);
        onContentChange(block.id, newLinkData);
    };

    const renderBlockContent = () => {
        switch (block.type) {
            case 'heading':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm text-gray-600">Heading</label>
                        <input type="text" value={typeof block.content === 'string' ? block.content : ''} onChange={(e) => onContentChange(block.id, e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]" placeholder="Heading" disabled={disabled} />
                    </div>
                );
            case 'paragraph':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm text-gray-600">Paragraph</label>
                        <textarea value={typeof block.content === 'string' ? block.content : ''} onChange={(e) => onContentChange(block.id, e.target.value)} rows={5} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]" placeholder="Paragraph" disabled={disabled} />
                    </div>
                );
            case 'rich_text':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm text-gray-600">Rich Text</label>
                        <CKEditor value={typeof block.content === 'string' ? block.content : ''} onChange={(data) => onContentChange(block.id, data)} disabled={disabled} />
                    </div>
                );
            case 'image':
                const imageData = typeof block.content === 'object' ? block.content : { mode: 'upload', url: '', file: '', caption: '' };
                const handleImageChange = (f, v) => onContentChange(block.id, { ...imageData, [f]: v });
                return (
                    <div className="space-y-4">
                        <label className="block text-sm text-gray-600">Upload Image</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#C0934B] transition-colors">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => handleImageChange('file', reader.result);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="hidden"
                                id={`file-upload-${block.id}`}
                                disabled={disabled}
                            />
                            <label htmlFor={`file-upload-${block.id}`} className={`cursor-pointer flex flex-col items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Choose File</span>
                                <span className="text-xs text-gray-500">Supported formats: JPG, PNG, WebP</span>
                            </label>
                            {(imageData.file || imageData.previewUrl) && (
                                <div className="mt-4 relative inline-block">
                                    <img src={imageData.file || imageData.previewUrl} className="h-40 object-contain rounded-lg border border-gray-200" />
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleImageChange('file', '');
                                        }}
                                        className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title="Remove Image"
                                        disabled={disabled}
                                    >
                                        <FaRegTrashAlt className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            value={imageData.caption}
                            onChange={(e) => handleImageChange('caption', e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]"
                            placeholder="Image Caption (Optional)"
                            disabled={disabled}
                        />
                    </div>
                );
            case 'list':
                const listData = typeof block.content === 'object' ? block.content : { style: 'disc', items: typeof block.content === 'string' ? block.content : '' };
                const handleListChange = (f, v) => onContentChange(block.id, { ...listData, [f]: v });
                const handleImageUploadList = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => handleListChange('customImage', reader.result);
                        reader.readAsDataURL(file);
                    }
                };
                return (
                    <div className="space-y-4">
                        <select value={listData.style} onChange={(e) => handleListChange('style', e.target.value)} className="w-full border rounded p-2" disabled={disabled}><option value="disc">Disc</option><option value="decimal">Number</option><option value="custom">Custom</option></select>
                        {listData.style === 'custom' && (
                            <div className="space-y-2">
                                <input type="text" value={listData.customSymbol || ''} onChange={(e) => handleListChange('customSymbol', e.target.value)} placeholder="Symbol" className="w-full border rounded p-2" disabled={disabled} />

                                <div className="mt-2 space-y-2">
                                    <label className="block text-xs font-medium text-gray-500">Custom Image (Upload or URL)</label>

                                    {listData.customImage ? (
                                        <div className="flex items-center gap-2 bg-green-50 p-2 rounded border border-green-200">
                                            <span className="text-sm text-green-700">Image Uploaded</span>
                                            <button onClick={() => handleListChange('customImage', '')} className="text-red-500 text-xs" disabled={disabled}>Remove</button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUploadList}
                                                className="block w-full text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                disabled={disabled}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <textarea value={listData.items} onChange={(e) => handleListChange('items', e.target.value)} className="w-full border rounded p-2" rows={4} placeholder="Items (one per line)" disabled={disabled}></textarea>
                    </div>
                );
            case 'link':
                const lData = typeof block.content === 'object' ? block.content : { url: '', text: '' };
                return <div className="space-y-2"><input value={lData.url || ''} onChange={(e) => onContentChange(block.id, { ...lData, url: e.target.value })} placeholder="URL" className="w-full border p-2" disabled={disabled} /><input value={lData.text || ''} onChange={(e) => onContentChange(block.id, { ...lData, text: e.target.value })} placeholder="Text" className="w-full border p-2" disabled={disabled} /></div>;
            case 'table':
                const tableData = (typeof block.content === 'object' && block.content && block.content.data) ? block.content : {
                    rows: 3, cols: 3, data: []
                };
                const [rowsInput, setRowsInput] = useState(tableData.rows || 3);
                const [colsInput, setColsInput] = useState(tableData.cols || 3);

                const handleGenerateTable = () => {
                    const newRows = parseInt(rowsInput) || 2;
                    const newCols = parseInt(colsInput) || 2;
                    const currentData = tableData.data || [];
                    const newData = [];
                    for (let r = 0; r < newRows; r++) {
                        const row = [];
                        for (let c = 0; c < newCols; c++) {
                            row.push((currentData[r] && currentData[r][c]) ? currentData[r][c] : "");
                        }
                        newData.push(row);
                    }
                    onContentChange(block.id, { rows: newRows, cols: newCols, data: newData });
                };

                const handleCellChange = (rowIndex, colIndex, value) => {
                    const newData = [...tableData.data];
                    newData[rowIndex] = [...newData[rowIndex]];
                    newData[rowIndex][colIndex] = value;
                    onContentChange(block.id, { ...tableData, data: newData });
                };

                return (
                    <div className="space-y-4">
                        <div className="flex items-end gap-4">
                            <div className="space-y-1">
                                <label className="block text-sm text-gray-600">Row</label>
                                <input type="number" min="1" value={rowsInput} onChange={(e) => setRowsInput(e.target.value)} className="w-24 px-4 py-2 border border-gray-300 rounded-lg" disabled={disabled} />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm text-gray-600">Column</label>
                                <input type="number" min="1" value={colsInput} onChange={(e) => setColsInput(e.target.value)} className="w-24 px-4 py-2 border border-gray-300 rounded-lg" disabled={disabled} />
                            </div>
                            <button onClick={handleGenerateTable} className="px-6 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e]" disabled={disabled}>Generate Table</button>
                        </div>
                        {tableData.data && tableData.data.length > 0 && (
                            <div className="overflow-x-auto pb-2">
                                <div className="space-y-2 min-w-max">
                                    {tableData.data.map((row, rowIndex) => (
                                        <div key={rowIndex} className="flex gap-2">
                                            {row.map((cell, colIndex) => (
                                                <input key={`${rowIndex}-${colIndex}`} type="text" value={cell} onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                                    className={`w-32 px-3 py-2 border rounded ${rowIndex === 0 ? 'bg-gray-50 font-medium' : 'border-gray-300'}`} disabled={disabled} />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'quote':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm text-gray-600">Quote</label>
                        <textarea value={typeof block.content === 'string' ? block.content : ''} onChange={(e) => onContentChange(block.id, e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="Quote" rows={3} disabled={disabled} />
                    </div>
                );
            case 'footer':
                const footerData = (typeof block.content === 'object') ? block.content : { author: '', facebook: '', instagram: '', youtube: '', subscribeUrl: '', copyright: '' };
                const handleFooterChange = (field, value) => {
                    onContentChange(block.id, { ...footerData, [field]: value });
                };

                return (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Author Name</label>
                            <input
                                type="text"
                                value={footerData.author || ''}
                                onChange={(e) => handleFooterChange('author', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#C0934B] outline-none"
                                placeholder="e.g. Brew Readers"
                                disabled={disabled}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <FaFacebookF className="text-blue-600" /> Facebook URL
                                </label>
                                <input
                                    type="text"
                                    value={footerData.facebook || ''}
                                    onChange={(e) => handleFooterChange('facebook', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-1 focus:ring-[#C0934B] outline-none"
                                    placeholder="Optional"
                                    disabled={disabled}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <FaInstagram className="text-pink-600" /> Instagram URL
                                </label>
                                <input
                                    type="text"
                                    value={footerData.instagram || ''}
                                    onChange={(e) => handleFooterChange('instagram', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-1 focus:ring-[#C0934B] outline-none"
                                    placeholder="Optional"
                                    disabled={disabled}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <FaYoutube className="text-red-600" /> YouTube URL
                                </label>
                                <input
                                    type="text"
                                    value={footerData.youtube || ''}
                                    onChange={(e) => handleFooterChange('youtube', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-1 focus:ring-[#C0934B] outline-none"
                                    placeholder="Optional"
                                    disabled={disabled}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 font-medium">Subscribe Link (Join Now)</label>
                            <input
                                type="text"
                                value={footerData.subscribeUrl || ''}
                                onChange={(e) => handleFooterChange('subscribeUrl', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#C0934B] outline-none"
                                placeholder="https://..."
                                disabled={disabled}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Copyright Text</label>
                            <input
                                type="text"
                                value={footerData.copyright || ''}
                                onChange={(e) => handleFooterChange('copyright', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#C0934B] outline-none"
                                placeholder="e.g. © 2025 Rupie Times. All rights reserved."
                                disabled={disabled}
                            />
                        </div>
                    </div>
                );
            default:
                return <input value={typeof block.content === 'object' ? JSON.stringify(block.content) : block.content} onChange={(e) => onContentChange(block.id, e.target.value)} className="w-full border p-2" disabled={disabled} />;
        }
    };
    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white relative group">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium capitalize">{block.type === 'rich_text' ? 'Rich Text' : block.type}</h3>
                <button
                    onClick={() => onRemove(block.id)}
                    disabled={disabled}
                    className={`p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Remove Block"
                >
                    <FaRegTrashAlt className="w-4 h-4" />
                </button>
            </div>
            {renderBlockContent()}
        </div>
    );
}

function ContentBlockPreview({ block }) {
    if (!block.content) return null;
    if (block.type === 'rich_text') return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: block.content }} />;
    if (block.type === 'heading') return <h4 className="text-xl font-bold">{block.content}</h4>;
    if (block.type === 'paragraph') return <p>{block.content}</p>;
    if (block.type === 'image') {
        const url = typeof block.content === 'object' ? (block.content.mode === 'upload' ? (block.content.file || block.content.previewUrl) : block.content.url) : block.content;
        if (!url) return null;
        return <img src={url} className="max-w-full rounded" />;
    }
    if (block.type === 'list') {
        const data = typeof block.content === 'object' ? block.content : { items: block.content, style: 'disc' };
        const items = (data.items || '').split('\n').filter(i => i);

        if (data.style === 'custom') {
            return (
                <ul className="space-y-2">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            {data.customImage ? (
                                <img
                                    src={typeof data.customImage === 'string' ? data.customImage : (data.customImage.file || data.customImage.previewUrl)} // Handle both blob and meta
                                    alt="symbol"
                                    className="h-5 w-5 object-contain self-center"
                                />
                            ) : (
                                <span className="text-gray-800 font-medium">{data.customSymbol || '•'}</span>
                            )}
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            );
        }
        return <ul style={{ listStyle: data.style }} className="pl-5 space-y-1">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
    }
    if (block.type === 'table') {
        let content = block.content;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch (e) { }
        }
        if (typeof content !== 'object' || !content.data) return null;
        return (
            <div className="overflow-x-auto border rounded">
                <table className="min-w-full">
                    <tbody>
                        {content.data.map((row, i) => (
                            <tr key={i} className={i === 0 ? 'bg-[#D2B48C]' : 'bg-white'}>
                                {row.map((c, j) => <td key={j} className="px-4 py-2 border">{c}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
    if (block.type === 'quote') return <blockquote className="border-l-4 border-[#C0934B] pl-4 italic">{block.content}</blockquote>;

    if (block.type === 'link') {
        const linkData = typeof block.content === 'object' ? block.content : { url: '', text: '' };
        return (
            <a
                href={linkData.url}
                target={linkData.target === 'new' ? '_blank' : '_self'}
                className="text-blue-600 hover:underline"
                onClick={(e) => e.preventDefault()} // Prevent navigation in preview
            >
                {linkData.text || linkData.url}
            </a>
        );
    }

    if (block.type === 'footer') {
        const foot = (typeof block.content === 'object') ? block.content : {};

        return (
            <div className="rounded-[15px] border-[0.5px] border-gray-300 overflow-hidden my-4 font-sans bg-white shadow-sm mt-12 text-center">
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

    return null;
}
