// routes/templates.js
const express = require("express");
const router = express.Router();
const cloudinary = require("../Config/cloudinaryConfig");
const Template = require("../Models/templatesSchema");
require("dotenv").config(); // Load .env

// ================== HELPERS ==================

// Fetch templates from Cloudinary (with pagination)
const fetchFolderTemplates = async (folderPath, maxResults = 500) => {
  let allResources = [];
  let nextCursor = null;

  // Check ENV vars
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.warn(
      "⚠️ Cloudinary credentials missing in .env. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
    return [];
  }

  try {
    do {
      const result = await cloudinary.api.resources({
        type: "upload",
        prefix: folderPath,
        max_results: maxResults,
        next_cursor: nextCursor,
        resource_type: "image",
      });

      if (result.resources?.length) {
        allResources.push(
          ...result.resources.map((item) => ({
            id: item.public_id,
            url: item.secure_url,
            width: item.width,
            height: item.height,
            format: item.format,
            folder: item.public_id.includes("/")
              ? item.public_id.substring(0, item.public_id.lastIndexOf("/"))
              : "root",
          }))
        );
      }

      nextCursor = result.next_cursor || null;
    } while (nextCursor);

    console.log(
      `✅ Fetched ${allResources.length} templates from Cloudinary folder: ${folderPath}`
    );
    return allResources;
  } catch (err) {
    console.error("❌ Cloudinary fetch error:", err.message || err);
    return [];
  }
};

// Save templates to MongoDB in bulk
const saveTemplatesToDB = async (templates) => {
  if (!templates.length) return;

  try {
    const bulkOps = templates.map((temp) => ({
      updateOne: {
        filter: { name: temp.id },
        update: {
          $set: {
            name: temp.id,
            category: temp.folder.replace(/^Templates\//i, ""), // remove "Templates/"
            imageUrl: temp.url,
            tags: [],
            width: temp.width,
            height: temp.height,
            format: temp.format,
          },
        },
        upsert: true,
      },
    }));

    await Template.bulkWrite(bulkOps);
    console.log(`✅ Synced ${templates.length} templates to MongoDB`);
  } catch (err) {
    console.error("❌ Error saving templates to DB:", err.message);
  }
};

// ================== ROUTES ==================

// 📋 Sync Cloudinary → MongoDB → return categories
// 📂 Get Template Categories
router.get('/categories', async (req, res) => {
  try {
    const rootFolder = "Templates";
    console.log('🔍 Starting to fetch templates...');
    
    const allTemplates = await fetchFolderTemplates(`${rootFolder}/`, 500);
    console.log(`📊 Fetched ${allTemplates.length} templates from Cloudinary`);
    
    if (!allTemplates.length) {
      console.log('❌ No templates fetched - returning early');
      return res.status(200).json({
        success: true,
        totalCategories: 0,
        totalImages: 0,
        categories: {},
        message: "No templates fetched from Cloudinary. Check credentials or folder name.",
      });
    }
    
    console.log('💾 Saving templates to DB...');
    await saveTemplatesToDB(allTemplates, rootFolder);
    console.log('✅ Templates saved to DB');

    const templatesFromDB = await Template.find({}, 'name category imageUrl');
    console.log(`📚 Found ${templatesFromDB.length} templates in DB`);

    const categories = templatesFromDB.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = {
          name: t.category,
          urlName: t.category.replace(/ /g, '_'),
          templates: []
        };
      }
      acc[t.category].templates.push(t);
      return acc;
    }, {});

    console.log(`✅ Returning ${Object.keys(categories).length} categories`);

    res.status(200).json({
      success: true,
      totalCategories: Object.keys(categories).length,
      totalImages: templatesFromDB.length,
      categories
    });

  } catch (error) {
    console.error('❌ Error in /categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

//Get templates by category (POST)
router.post("/category", async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: "categoryName is required in payload",
      });
    }

    const category = decodeURIComponent(categoryName).replace(/_/g, " ");

    const templates = await Template.find(
      { category },
      "name imageUrl width height format"
    );

    if (!templates.length) {
      return res.status(404).json({
        success: false,
        message: `No templates found in category "${category}"`,
        category,
      });
    }

    res.status(200).json({
      success: true,
      category,
      count: templates.length,
      templates,
    });
  } catch (error) {
    console.error("❌ Error in /category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔍 Search templates (GET /search?category=...&tags=...)
router.get("/search", async (req, res) => {
  try {
    const { category, format, minWidth, minHeight, tags } = req.query;
    const query = {};

    if (category) query.category = category;
    if (format) query.format = format.toLowerCase();
    if (minWidth) query.width = { $gte: parseInt(minWidth) };
    if (minHeight) query.height = { ...query.height, $gte: parseInt(minHeight) };
    if (tags) query.tags = { $all: tags.split(",").map((t) => t.trim()) };

    const results = await Template.find(
      query,
      "name category imageUrl width height format"
    );

    res.status(200).json({
      success: true,
      filters: { category, format, minWidth, minHeight, tags },
      count: results.length,
      templates: results,
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📄 List all templates
router.get("/all", async (req, res) => {
  try {
    const allTemplates = await Template.find(
      {},
      "name category imageUrl width height format"
    );
    res.status(200).json({
      success: true,
      count: allTemplates.length,
      templates: allTemplates,
    });
  } catch (error) {
    console.error("❌ Error in /all:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
