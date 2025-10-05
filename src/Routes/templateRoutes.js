const express = require('express');
const router = express.Router();
const cloudinary = require('../Config/cloudinaryConfig');
const Template = require('../Models/templatesSchema');

// ================== HELPERS ==================

// Fetch resources from Cloudinary
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
        allResources.push(...result.resources.map(item => ({
          id: item.public_id,
          url: item.secure_url,
          width: item.width,
          height: item.height,
          format: item.format,
          folder: item.public_id.includes('/')
            ? item.public_id.substring(0, item.public_id.lastIndexOf('/'))
            : 'root'
        })));
      }

      nextCursor = result.next_cursor || null;
    } catch (err) {
      console.warn(`⚠️ Error fetching resources from ${folderPath}: ${err.message}`);
      nextCursor = null;
    }
  } while (nextCursor);

  return allResources;
};

// Save fetched templates to DB
const saveTemplatesToDB = async (templates, rootFolder) => {
  if (!templates.length) return;

  const bulkOps = templates.map(template => ({
    updateOne: {
      filter: { name: template.id },
      update: {
        $set: {
          name: template.id,
          category: template.folder.replace(`${rootFolder}/`, ''),
          imageUrl: template.url,
          tags: [],
          width: template.width,
          height: template.height,
          format: template.format,
        }
      },
      upsert: true,
    }
  }));

  await Template.bulkWrite(bulkOps);
};

// ================== ROUTES ==================

// 📂 Get Template Categories
router.get('/categories', async (req, res) => {
  try {
    const rootFolder = "Templates";
    const allTemplates = await fetchFolderTemplates(`${rootFolder}/`, 500);
    await saveTemplatesToDB(allTemplates, rootFolder);

    const templatesFromDB = await Template.find({}, 'name category imageUrl');

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

    res.status(200).json({
      success: true,
      totalCategories: Object.keys(categories).length,
      totalImages: templatesFromDB.length,
      categories
    });

  } catch (error) {
    console.error('❌ Error fetching template categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📂 Get Templates by Category (from payload)
router.post('/category', async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({ success: false, message: "categoryName is required in payload" });
    }

    const category = decodeURIComponent(categoryName).replace(/_/g, ' ');
    const templates = await Template.find(
      { category },
      'name imageUrl width height format'
    );

    if (!templates.length) {
      return res.status(404).json({ success: false, message: `No templates found in "${category}"` });
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

// 🔍 Search Templates (by filters)
router.get('/search', async (req, res) => {
  try {
    const { category, format, minWidth, minHeight, tags } = req.query;
    const query = {};

    if (category) query.category = category;
    if (format) query.format = format.toLowerCase();
    if (minWidth) query.width = { $gte: parseInt(minWidth) };
    if (minHeight) query.height = { ...query.height, $gte: parseInt(minHeight) };
    if (tags) query.tags = { $all: tags.split(',').map(t => t.trim()) };

    const results = await Template.find(query, 'name category imageUrl width height format');
    res.status(200).json({ success: true, count: results.length, templates: results });

  } catch (error) {
    console.error('❌ Template search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📂 Get All Templates
router.get('/all', async (req, res) => {
  try {
    const allTemplates = await Template.find({}, 'name category imageUrl width height format');
    res.status(200).json({ success: true, count: allTemplates.length, templates: allTemplates });
  } catch (error) {
    console.error('❌ Error fetching all templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;