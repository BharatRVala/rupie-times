"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import CKEditor from "@/app/components/CKEditor";
import { FaTrash, FaPlus, FaCheck, FaTimes, FaFacebookF, FaInstagram, FaYoutube } from 'react-icons/fa';
import GlobalLoader from '@/app/components/GlobalLoader';

import dynamic from 'next/dynamic';

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

function ProductArticleSectionsPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const insertAtParam = searchParams.get('insertAt');
    const insertAt = insertAtParam ? parseInt(insertAtParam, 10) : undefined;

    // Adapted params for Product Article
    const productId = params.id;
    const articleId = params.articleId;

    const [article, setArticle] = useState(null);
    const [sectionHeading, setSectionHeading] = useState("");
    const [contentBlocks, setContentBlocks] = useState([]);
    const [showBlockTypeMenu, setShowBlockTypeMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isAddingSection, setIsAddingSection] = useState(false);

    // Initial Fetch
    useEffect(() => {
        const fetchArticle = async () => {
            if (!articleId) return;
            try {
                // Fetch article details
                // Using Product specific endpoint
                const response = await fetch(`/api/admin/products/${productId}/articles/${articleId}`);
                const data = await response.json();

                if (data.success && data.article) {
                    setArticle(data.article);
                } else {
                    toast.error("Article not found");
                    router.push(`/admin-dashboard/product/${productId}`);
                }
            } catch (error) {
                console.error("Error fetching article:", error);
                toast.error("Failed to load article");
                router.push(`/admin-dashboard/product/${productId}`);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [articleId, productId, router]);

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
        // Using Product Article Upload Endpoint
        const uploadUrl = '/api/admin/products/upload-article-image';

        const res = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.error || "Image upload failed");

        return {
            filename: data.filename,
            contentType: data.contentType,
            gridfsId: data.gridfsId || data.id, // Ensure gridfsId is present for backend schema
            size: data.size
        };
    };

    // Handle Add Section (Submit Logic)
    const handleAddSection = async () => {
        if (!sectionHeading.trim() && contentBlocks.length === 0) {
            toast.error("Please add a heading or content blocks");
            return;
        }

        setIsAddingSection(true);
        try {
            // Process blocks (upload images, format configured blocks)
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

                    if (imgData.mode === 'upload' && imgData.file) {
                        if (imgData.file.startsWith('data:')) {
                            const fetchBlob = await fetch(imgData.file);
                            const blob = await fetchBlob.blob();
                            const file = new File([blob], "image.png", { type: blob.type });

                            const uploadMeta = await uploadImageFile(file);
                            processed.image = uploadMeta;
                        }
                    } else if (imgData.mode === 'url') {
                        processed.content = imgData.url; // Store URL in content (schema expects string) or logic handles it
                    }
                }
                else if (block.type === 'list') {
                    const listData = typeof block.content === 'object' ? block.content : { style: 'disc', items: block.content };
                    let customImageMeta = null;

                    if (listData.style === 'custom' && listData.customImage) {
                        if (listData.customImage.startsWith('data:')) {
                            const fetchBlob = await fetch(listData.customImage);
                            const blob = await fetchBlob.blob();
                            const file = new File([blob], "bullet.png", { type: blob.type });
                            customImageMeta = await uploadImageFile(file);
                        }
                    }

                    processed.listConfig = {
                        type: listData.style, // Use the style directly as type (disc, circle, square, decimal, custom)
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
                    // Footer is stored as JSON string in content
                    if (typeof block.content === 'object') {
                        processed.content = JSON.stringify(block.content);
                    } else {
                        processed.content = block.content;
                    }
                }
                else {
                    // Heading, Paragraph, Quote, Editor
                    processed.content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
                }

                return processed;
            }));

            // Use the Product Article Sections API
            const response = await fetch(`/api/admin/products/${productId}/articles/${articleId}/sections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    heading: sectionHeading,
                    contentBlocks: processedBlocks,
                    position: insertAt
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Section added successfully!");
                toast.success("Section added successfully");
                router.push(`/admin-dashboard/product/${productId}/view/${articleId}`);
                // Refresh logic if needed
            } else {
                toast.error(data.error || "Failed to add section");
                setIsAddingSection(false);
            }

        } catch (error) {
            console.error("Error adding section:", error);
            toast.error("An error occurred: " + error.message);
            setIsAddingSection(false);
        }
    };

    const handleBack = () => {
        router.push(`/admin-dashboard/product/${productId}`);
    };

    if (loading) return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
    if (!article) return null;

    return (
        <div className="max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1E4032]">{article.mainHeading}</h1>
                    <p className="text-gray-500">Manage Sections</p>
                </div>
                <button
                    onClick={handleBack}
                    className="px-4 py-2 bg-white border border-[#C0934B] text-[#C0934B] rounded-lg hover:bg-[#C0934B] hover:text-white transition-colors"
                >
                    Back to Product
                </button>
            </div>

            {/* Editor Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left: Editor */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 relative">

                    <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Section</h2>

                    <div className="relative">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Section Heading <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                value={sectionHeading}
                                onChange={(e) => setSectionHeading(e.target.value)}
                                placeholder="Enter section heading..."
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]"
                                disabled={isAddingSection}
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
                                            disabled={isAddingSection}
                                        />
                                    ))}
                                </div>

                                {/* Add Block Button */}
                                <div className="absolute bottom-2 right-2">
                                    <button
                                        onClick={() => setShowBlockTypeMenu(!showBlockTypeMenu)}
                                        disabled={isAddingSection}
                                        className={`w-10 h-10 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-md ${isAddingSection ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="text-white text-2xl font-bold">+</span>
                                    </button>
                                    {showBlockTypeMenu && (
                                        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-48 z-10">
                                            <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">Select Block Type</div>
                                            {blockTypes.map(bt => {
                                                const isFooter = bt.type === 'footer';
                                                const footerExists = article?.sections?.some(s => s.contentBlocks?.some(b => b.blockType === 'footer' || b.type === 'footer')) || contentBlocks.some(b => b.type === 'footer');
                                                const disabled = isFooter && footerExists;

                                                return (
                                                    <button
                                                        key={bt.type}
                                                        onClick={() => !disabled && handleAddBlock(bt.type)}
                                                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-gray-100'}`}
                                                        title={disabled ? "Only one footer allowed per article" : ""}
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

                        <button
                            onClick={handleAddSection}
                            disabled={isAddingSection}
                            className={`w-full px-4 py-2.5 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors font-medium flex items-center justify-center gap-2 ${isAddingSection ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isAddingSection ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Adding...
                                </>
                            ) : "Add Section"}
                        </button>
                    </div>
                </div>

                {/* Right: Preview */}
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
            {isAddingSection && (
                <div className="fixed inset-0 z-[9999]">
                    <GlobalLoader />
                </div>
            )}
        </div>
    );
}

// --- Helper Components ---

function ContentBlockEditor({ block, onContentChange, onRemove, disabled }) {

    const renderBlockContent = () => {
        switch (block.type) {
            case 'heading':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm text-gray-600">Heading</label>
                        <input type="text" value={typeof block.content === 'string' ? block.content : ''} onChange={(e) => onContentChange(block.id, e.target.value)} className="w-full border rounded p-2" placeholder="Heading text" disabled={disabled} />
                    </div>
                );
            case 'paragraph':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm text-gray-600">Paragraph</label>
                        <textarea value={typeof block.content === 'string' ? block.content : ''} onChange={(e) => onContentChange(block.id, e.target.value)} className="w-full border rounded p-2" rows={4} placeholder="Paragraph text" disabled={disabled} />
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
                const imageData = typeof block.content === 'object' ? block.content : {
                    mode: 'upload', url: '', file: '', caption: ''
                };
                const handleImageChange = (field, value) => onContentChange(block.id, { ...imageData, [field]: value });
                const handleFileUpload = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => handleImageChange('file', reader.result);
                        reader.readAsDataURL(file);
                    }
                };
                return (
                    <div className="space-y-4">
                        <label className="block text-sm text-gray-600">Upload Image</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#C0934B] transition-colors">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                id={`file-upload-${block.id}`}
                            />
                            <label htmlFor={`file-upload-${block.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                                <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Choose File</span>
                                <span className="text-xs text-gray-500">Supported formats: JPG, PNG, WebP</span>
                            </label>
                            {imageData.file && (
                                <div className="mt-4 relative inline-block">
                                    <img src={imageData.file} className="h-40 object-contain rounded-lg border border-gray-200" />
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleImageChange('file', '');
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                                        title="Remove Image"
                                    >
                                        <FaTrash className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <input type="text" value={imageData.caption} onChange={(e) => handleImageChange('caption', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="Caption" />
                    </div>
                );
            case 'list':
                const listData = typeof block.content === 'object' ? block.content : {
                    style: 'disc', customSymbol: '', customImage: '', items: typeof block.content === 'string' ? block.content : ''
                };
                const handleListChange = (field, value) => {
                    const newData = { ...listData, [field]: value };
                    onContentChange(block.id, newData);
                };
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
                        <div className="space-y-2">
                            <label className="block text-sm text-gray-600">List Style</label>
                            <select value={listData.style || 'disc'} onChange={(e) => handleListChange('style', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
                                <option value="disc">Disc (•)</option>
                                <option value="circle">Circle (○)</option>
                                <option value="square">Square (■)</option>
                                <option value="decimal">Number (1, 2, 3)</option>
                                <option value="lower-alpha">Lowercase Alpha (a, b, c)</option>
                                <option value="upper-alpha">Uppercase Alpha (A, B, C)</option>
                                <option value="lower-roman">Lowercase Roman (i, ii, iii)</option>
                                <option value="upper-roman">Uppercase Roman (I, II, III)</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        {listData.style === 'custom' && (
                            <div className="space-y-2">
                                <label className="block text-sm text-gray-600">Custom Symbol (or Image)</label>
                                <input type="text" value={listData.customSymbol || ''} onChange={(e) => handleListChange('customSymbol', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="Symbol" />

                                <div className="mt-2 space-y-2">
                                    <label className="block text-xs font-medium text-gray-500">Custom Image</label>

                                    {listData.customImage ? (
                                        <div className="flex items-center gap-2 bg-green-50 p-2 rounded border border-green-200">
                                            <span className="text-sm text-green-700">Image Uploaded</span>
                                            <button onClick={() => handleListChange('customImage', '')} className="text-red-500 text-xs">Remove</button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUploadList}
                                                className="block w-full text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <textarea value={listData.items || ''} onChange={(e) => handleListChange('items', e.target.value)} rows={6} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#C0934B]" placeholder="Items (one per line)" />
                    </div>
                );
            case 'link':
                const lData = typeof block.content === 'object' ? block.content : { url: '', text: '', target: 'same' };
                const updateLink = (f, v) => onContentChange(block.id, { ...lData, [f]: v });
                return (
                    <div className="space-y-2">
                        <input value={lData.url || ''} onChange={(e) => updateLink('url', e.target.value)} placeholder="URL" className="w-full border p-2 rounded" />
                        <input value={lData.text || ''} onChange={(e) => updateLink('text', e.target.value)} placeholder="Text" className="w-full border p-2 rounded" />
                        <select value={lData.target} onChange={(e) => updateLink('target', e.target.value)} className="w-full border p-2 rounded">
                            <option value="same">Same Tab</option>
                            <option value="new">New Tab</option>
                        </select>
                    </div>
                );
            case 'table':
                const tableData = (typeof block.content === 'object' && block.content.data) ? block.content : { rows: 3, cols: 3, data: [] };
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
                            // Try to preserve existing data
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
                                <input type="number" min="1" value={rowsInput} onChange={(e) => setRowsInput(e.target.value)} className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]" />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm text-gray-600">Column</label>
                                <input type="number" min="1" value={colsInput} onChange={(e) => setColsInput(e.target.value)} className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]" />
                            </div>
                            <button onClick={handleGenerateTable} className="px-6 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors font-medium">Generate Table</button>
                        </div>
                        {tableData.data && tableData.data.length > 0 && (
                            <div className="overflow-x-auto pb-2">
                                <div className="space-y-2 min-w-max">
                                    {tableData.data.map((row, rowIndex) => (
                                        <div key={rowIndex} className="flex gap-2">
                                            {row.map((cell, colIndex) => (
                                                <input key={`${rowIndex}-${colIndex}`} type="text" value={cell} onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                                    className={`w-32 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#C0934B] ${rowIndex === 0 ? 'bg-gray-50 font-medium' : 'border-gray-300'}`} />
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
                        <textarea value={typeof block.content === 'string' ? block.content : ''} onChange={(e) => onContentChange(block.id, e.target.value)} className="w-full border rounded p-2" rows={3} placeholder="Quote text" />
                    </div>
                );
            case 'footer':
                const fData = (typeof block.content === 'object') ? block.content : { author: '', facebook: '', instagram: '', youtube: '', subscribeUrl: '', copyright: '' };
                const uFooter = (f, v) => onContentChange(block.id, { ...fData, [f]: v });
                return (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Author Name</label>
                            <input value={fData.author || ''} onChange={e => uFooter('author', e.target.value)} placeholder="e.g. Brew Readers" className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#C0934B] outline-none" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <FaFacebookF className="text-blue-600" /> Facebook URL
                                </label>
                                <input value={fData.facebook || ''} onChange={e => uFooter('facebook', e.target.value)} placeholder="Optional" className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-1 focus:ring-[#C0934B] outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <FaInstagram className="text-pink-600" /> Instagram URL
                                </label>
                                <input value={fData.instagram || ''} onChange={e => uFooter('instagram', e.target.value)} placeholder="Optional" className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-1 focus:ring-[#C0934B] outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <FaYoutube className="text-red-600" /> YouTube URL
                                </label>
                                <input value={fData.youtube || ''} onChange={e => uFooter('youtube', e.target.value)} placeholder="Optional" className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-1 focus:ring-[#C0934B] outline-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 font-medium">Subscribe Link (Join Now)</label>
                            <input value={fData.subscribeUrl || ''} onChange={e => uFooter('subscribeUrl', e.target.value)} placeholder="https://..." className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#C0934B] outline-none" />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Copyright Text</label>
                            <input value={fData.copyright || ''} onChange={e => uFooter('copyright', e.target.value)} placeholder="e.g. © 2025 Rupie Times. All rights reserved." className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#C0934B] outline-none" />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="border border-gray-200 rounded p-4 relative group">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium capitalize">{block.type === 'rich_text' ? 'Rich Text' : block.type}</h3>
                <button
                    onClick={() => onRemove(block.id)}
                    disabled={disabled}
                    className={`p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Remove Block"
                >
                    <FaTrash className="w-4 h-4" />
                </button>
            </div>
            {renderBlockContent()}
        </div>
    );
}

function ContentBlockPreview({ block }) {
    if (!block.content && block.type !== 'image' && block.type !== 'footer') return null;

    if (block.type === 'rich_text') return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: block.content }} />;
    if (block.type === 'heading') return <h4 className="text-xl font-bold">{block.content}</h4>;
    if (block.type === 'paragraph') return <p>{block.content}</p>;
    if (block.type === 'quote') return <blockquote className="border-l-4 border-[#C0934B] pl-4 italic">{block.content}</blockquote>;

    if (block.type === 'image') {
        const imgData = typeof block.content === 'object' ? block.content : { mode: 'url', url: block.content };
        const url = imgData.mode === 'upload' ? imgData.file : imgData.url;
        const caption = imgData.caption;

        if (!url) return null;
        return (
            <div className="relative rounded overflow-hidden">
                <img src={url} className="max-w-full rounded" alt={caption || 'Preview'} />
                {caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-xs text-center">
                        {caption}
                    </div>
                )}
            </div>
        );
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
                                    src={data.customImage}
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

    if (block.type === 'link') {
        const url = block.linkConfig?.url || block.content;
        const text = block.linkConfig?.text || 'Review Link';
        return <a href={url} target="_blank" rel="noreferrer" className="text-[#C0934B] hover:underline block my-2 font-medium">{text}</a>;
    }

    if (block.type === 'table') {
        const t = (typeof block.content === 'object' && block.content.data) ? block.content : null;
        if (!t) return null;
        return (
            <div className="overflow-auto border rounded">
                <table className="min-w-full">
                    <tbody>
                        {t.data.map((r, i) => (
                            <tr key={i} className={i === 0 ? 'bg-[#D2B48C]' : 'bg-white'}>
                                {r.map((c, j) => <td key={j} className="border p-2">{c}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (block.type === 'footer') {
        const footerData = (typeof block.content === 'object') ? block.content : {};

        return (
            <div className="rounded-[15px] border-[0.5px] border-gray-300 overflow-hidden my-4 font-sans bg-white shadow-sm">
                <div className="bg-[#C0934B] py-4 flex justify-center gap-6 text-white text-lg">
                    {footerData.facebook && <FaFacebookF className="hover:scale-110 transition-transform cursor-pointer" />}
                    {footerData.instagram && <FaInstagram className="hover:scale-110 transition-transform cursor-pointer" />}
                    {footerData.youtube && <FaYoutube className="hover:scale-110 transition-transform cursor-pointer" />}
                    {(!footerData.facebook && !footerData.instagram && !footerData.youtube) && <span className="text-sm opacity-50">Social Links</span>}
                </div>

                <div className="p-6 text-center text-black">
                    <p className="mb-2 text-sm text-gray-900 font-medium">
                        Written By <span className="underline font-bold">{footerData.author || 'Author Name'}</span>
                    </p>

                    {footerData.subscribeUrl && (
                        <p className="mb-4 text-xs text-gray-900 font-medium">
                            Subscribe for more updates <a href={footerData.subscribeUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">Join Now.</a>
                        </p>
                    )}

                    <div className="border-t border-gray-100 w-full pt-4 text-[10px] font-bold text-[#00301F]">
                        {footerData.copyright || `© ${new Date().getFullYear()} Rupie Times. All rights reserved.`}
                    </div>
                </div>
            </div>
        );
    }

    return <div>{JSON.stringify(block.content)}</div>;
}

export default function ProductArticleSectionsPageWrapper() {
    return (
        <Suspense fallback={<GlobalLoader fullScreen={false} className="min-h-[60vh]" />}>
            <ProductArticleSectionsPage />
        </Suspense>
    );
}
