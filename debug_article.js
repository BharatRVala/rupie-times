const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
let uri = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/MONGODB_URI=(.+)/);
    if (match) {
        uri = match[1].trim().replace(/^["']|["']$/g, '');
    } else {
        console.error("MONGODB_URI not found in .env");
    }
} catch (e) {
    console.error("Could not read .env file:", e.message);
}

if (!uri) {
    console.error("No MongoDB URI found.");
    process.exit(1);
}

console.log("Connecting to DB (URI found)...");

const FreeArticleSchema = new mongoose.Schema({
    mainHeading: String,
    isActive: Boolean,
    accessType: String,
    sections: [Object]
}, { timestamps: true });

const FreeArticle = mongoose.models.FreeArticle || mongoose.model('FreeArticle', FreeArticleSchema);

async function run() {
    try {
        await mongoose.connect(uri);
        console.log("Connected to MongoDB.");

        const id = '6953c6b17d06c0370517badd';
        console.log(`Checking for article with ID: ${id}`);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error("Invalid ObjectId format.");
            return;
        }

        const article = await FreeArticle.findById(id);

        if (article) {
            console.log("---------------------------------------------------");
            console.log("Article FOUND!");
            console.log("ID:", article._id.toString());
            console.log("Title:", article.mainHeading);
            console.log("IsActive:", article.isActive);
            console.log("AccessType:", article.accessType);
            console.log("Sections:", article.sections ? article.sections.length : 0);
            console.log("---------------------------------------------------");
        } else {
            console.log("---------------------------------------------------");
            console.log("❌ Article NOT FOUND in 'freearticles' collection.");
            console.log("---------------------------------------------------");

            // List some existing articles to verify collection is not empty
            console.log("Listing recent 3 articles:");
            const recent = await FreeArticle.find().limit(3).sort({ createdAt: -1 });
            recent.forEach(a => console.log(`- ${a._id}: ${a.mainHeading}`));
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
