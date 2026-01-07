import mongoose from 'mongoose';

const NewsContentBlockSchema = new mongoose.Schema({
    blockType: {
        type: String,
        required: true,
        enum: ['heading', 'paragraph', 'image', 'quote', 'list', 'table', 'link', 'rich_text', 'editor', 'footer'],
        default: 'paragraph'
    },
    content: {
        type: String,
        trim: true,
        default: ''
    },
    image: {
        filename: String,
        contentType: String,
        size: Number,
        gridfsId: String
    },
    order: {
        type: Number,
        required: true,
        default: 0
    },
    style: {
        type: Object,
        default: {}
    },
    listConfig: {
        type: {
            type: String,
            enum: ['bullet', 'number', 'custom', 'disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'],
            default: 'bullet'
        },
        customSymbol: String,
        customImage: {
            filename: String,
            contentType: String,
            size: Number,
            gridfsId: String
        }
    },
    linkConfig: {
        url: {
            type: String,
            trim: true
        },
        target: {
            type: String,
            enum: ['_self', '_blank'],
            default: '_self'
        },
        title: {
            type: String,
            trim: true
        }
    }
}, {
    timestamps: true
});

const NewsSectionSchema = new mongoose.Schema({
    heading: {
        type: String,
        required: false,
        trim: true
    },
    contentBlocks: [NewsContentBlockSchema]
}, {
    timestamps: true
});

const NewsSchema = new mongoose.Schema({
    mainHeading: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true,
        default: 'News'
    },
    newsType: {
        type: String,
        enum: ['Business & Entrepreneur Playbook', 'Economy & Policy Lens', 'Smart Money Habits'],
        trim: true
    },
    author: {
        type: String,
        default: 'Rupie Times',
        trim: true
    },
    createdBy: {
        type: String,
        default: 'Admin'
    },
    sections: [NewsSectionSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    isImportant: {
        type: Boolean,
        default: false
    },
    featuredImage: {
        filename: String,
        contentType: String,
        size: Number,
        gridfsId: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
NewsSchema.index({ isActive: 1, createdAt: -1 });
NewsSchema.index({ isImportant: 1 });
NewsSchema.index({ 'sections.contentBlocks.order': 1 });

// Virtual for formatted date
NewsSchema.virtual('formattedDate').get(function () {
    return this.createdAt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
});

// Virtual for total sections count
NewsSchema.virtual('totalSections').get(function () {
    return this.sections ? this.sections.length : 0;
});

// Method to get content summary (first few paragraphs)
NewsSchema.methods.getSummary = function (maxLength = 200) {
    let summary = '';

    // Get content from first few content blocks
    for (const section of this.sections) {
        for (const block of section.contentBlocks) {
            if (block.blockType === 'paragraph' && block.content) {
                summary += block.content + ' ';
                if (summary.length > maxLength) {
                    return summary.substring(0, maxLength) + '...';
                }
            }
        }
    }

    return summary || this.description;
};

// Pre-save middleware to sort content blocks
NewsSchema.pre('save', function (next) {
    if (this.sections && this.sections.length > 0) {
        this.sections.forEach(section => {
            if (section.contentBlocks && section.contentBlocks.length > 0) {
                section.contentBlocks.sort((a, b) => a.order - b.order);
            }
        });
    }
    next();
});

const News = mongoose.models.News || mongoose.model('News', NewsSchema);

export default News;
