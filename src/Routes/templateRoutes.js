const express = require('express');
const router = express.Router();
const cloudinary = require('../Config/cloudinaryConfig');
const Template = require('../Models/templatesSchema');
require('dotenv').config(); // Ensure .env is loaded

// ================== HELPERS ==================

// Fetch templates from Cloudinary folder (recursively)
const fetchFolderTemplates = async (folderPath, maxResults = 500) => {
  let allResources = [];
  let nextCursor = null;

  do {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: maxResults,
        next_cursor: nextCursor,
        resource_type: 'image',
      });

      if (result.resources?.length) {
        allResources.push(
          ...result.resources.map((item) => ({
            id: item.public_id,
            url: item.secure_url,
            width: item.width,
            height: item.height,
            format: item.format,
            folder: item.public_id.includes('/')
              ? item.public_id.substring(0, item.public_id.lastIndexOf('/'))
              : 'root',
          }))
        );
      }

      nextCursor = result.next_cursor || null;
    } catch (err) {
      console.warn(`⚠️ Error fetching resources from ${folderPath}: ${err.message}`);
      nextCursor = null;
    }
  } while (nextCursor);

  console.log(`Fetched ${allResources.length} templates from Cloudinary folder: ${folderPath}`);
  return allResources;
};

// Bulk save templates to MongoDB
const saveTemplatesToDB = async (templates) => {
  if (!templates.length) return;

  const bulkOps = templates.map((temp) => ({
    updateOne: {
      filter: { name: temp.id },
      update: {
        $set: {
          name: temp.id,
          category: temp.folder.replace('Templates/', ''), // ensure correct folder
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
};

// ================== ROUTES ==================

// 📋 Sync Cloudinary templates to DB and return categories
router.get('/categories', async (req, res) => {
  try {
    const rootFolder = 'Templates'; // Ensure exact case

    // Fetch templates from Cloudinary
    const allTemplates = await fetchFolderTemplates(`${rootFolder}/`, 500);

    if (!allTemplates.length) {
      return res.status(200).json({
        success: true,
        totalCategories: 0,
        totalImages: 0,
        categories: {},
        message: 'No templates fetched from Cloudinary. Check credentials or folder name.',
      });
    }

    // Save to MongoDB in bulk
    await saveTemplatesToDB(allTemplates);

    // Fetch only required fields grouped by category
    const templatesFromDB = await Template.find({}, 'name category imageUrl');

    const categories = templatesFromDB.reduce((acc, temp) => {
      if (!acc[temp.category])
        acc[temp.category] = {
          name: temp.category,
          urlName: temp.category.replace(/ /g, '_'),
          templates: [],
        };
      acc[temp.category].templates.push(temp);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      totalCategories: Object.keys(categories).length,
      totalImages: templatesFromDB.length,
      categories,
    });
  } catch (error) {
    console.error('❌ Error syncing/fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📁 Get templates by category
router.post('/category', async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: 'categoryName is required in payload',
      });
    }

    const category = decodeURIComponent(categoryName).replace(/_/g, ' ');

    const templates = await Template.find(
      { category },
      'name imageUrl width height format'
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
    console.error('❌ Error fetching template category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔍 Search/filter templates in DB
router.get('/search', async (req, res) => {
  try {
    const { category, format, minWidth, minHeight, tags } = req.query;
    const query = {};

    if (category) query.category = category;
    if (format) query.format = format.toLowerCase();
    if (minWidth) query.width = { $gte: parseInt(minWidth) };
    if (minHeight) query.height = { ...query.height, $gte: parseInt(minHeight) };
    if (tags) query.tags = { $all: tags.split(',').map((t) => t.trim()) };

    const results = await Template.find(
      query,
      'name category imageUrl width height format'
    );

    res.status(200).json({
      success: true,
      filters: { category, format, minWidth, minHeight, tags },
      count: results.length,
      templates: results,
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📄 List all templates flat
router.get('/all', async (req, res) => {
  try {
    const allTemplates = await Template.find(
      {},
      'name category imageUrl width height format'
    );
    res.status(200).json({
      success: true,
      count: allTemplates.length,
      templates: allTemplates,
    });
  } catch (error) {
    console.error('❌ Error fetching all templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
