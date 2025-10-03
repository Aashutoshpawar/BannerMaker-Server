const express = require('express');
const router = express.Router();
const cloudinary = require('../Config/cloudinaryConfig');
const Sticker = require('../Models/stickersSchema');  // ✅ Correct Model
const mongoose = require('mongoose');

// ================== HELPERS ==================

// Fetch resources from Cloudinary
const fetchFolderStickers = async (folderPath, maxResults = 500) => {
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

// Save fetched stickers to DB
const saveStickersToDB = async (stickers, rootFolder) => {
  if (!stickers.length) return;

  const bulkOps = stickers.map(sticker => ({
    updateOne: {
      filter: { name: sticker.id },
      update: {
        $set: {
          name: sticker.id,
          category: sticker.folder.replace(`${rootFolder}/`, ''),
          imageUrl: sticker.url,
          tags: [],
          width: sticker.width,
          height: sticker.height,
          format: sticker.format,
        }
      },
      upsert: true,
    }
  }));

  await Sticker.bulkWrite(bulkOps);
};

// ================== ROUTES ==================

// 📂 Get Sticker Categories
router.get('/categories', async (req, res) => {
  try {
    const rootFolder = "Stickers";
    const allStickers = await fetchFolderStickers(`${rootFolder}/`, 500);
    await saveStickersToDB(allStickers, rootFolder);

    const stickersFromDB = await Sticker.find({}, 'name category imageUrl');

    const categories = stickersFromDB.reduce((acc, s) => {
      if (!acc[s.category]) {
        acc[s.category] = {
          name: s.category,
          urlName: s.category.replace(/ /g, '_'),
          stickers: []
        };
      }
      acc[s.category].stickers.push(s);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      totalCategories: Object.keys(categories).length,
      totalImages: stickersFromDB.length,
      categories
    });

  } catch (error) {
    console.error('❌ Error fetching sticker categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📂 Get Stickers by Category
// 📂 Get Stickers by Category (from payload)
router.post('/category', async (req, res) => {
  try {
    const { categoryName } = req.body;   // ✅ Now we read from payload

    if (!categoryName) {
      return res.status(400).json({ success: false, message: "categoryName is required in payload" });
    }

    const category = decodeURIComponent(categoryName).replace(/_/g, ' ');
    const stickers = await Sticker.find(
      { category },
      'name imageUrl width height format'
    );

    if (!stickers.length) {
      return res.status(404).json({ success: false, message: `No stickers found in "${category}"` });
    }

    res.status(200).json({
      success: true,
      category,
      count: stickers.length,
      stickers,
    });

  } catch (error) {
    console.error('❌ Error fetching sticker category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔍 Search Stickers (by filters)
router.get('/search', async (req, res) => {
  try {
    const { category, format, minWidth, minHeight, tags } = req.query;
    const query = {};

    if (category) query.category = category;
    if (format) query.format = format.toLowerCase();
    if (minWidth) query.width = { $gte: parseInt(minWidth) };
    if (minHeight) query.height = { ...query.height, $gte: parseInt(minHeight) };
    if (tags) query.tags = { $all: tags.split(',').map(t => t.trim()) };

    const results = await Sticker.find(query, 'name category imageUrl width height format');
    res.status(200).json({ success: true, count: results.length, stickers: results });

  } catch (error) {
    console.error('❌ Sticker search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📂 Get All Stickers
router.get('/all', async (req, res) => {
  try {
    const allStickers = await Sticker.find({}, 'name category imageUrl width height format');
    res.status(200).json({ success: true, count: allStickers.length, stickers: allStickers });
  } catch (error) {
    console.error('❌ Error fetching all stickers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
