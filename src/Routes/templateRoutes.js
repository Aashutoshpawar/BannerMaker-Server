const express = require('express');
const router = express.Router();
const cloudinary = require('../Config/cloudinaryConfig');

// ================== HELPERS ==================
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
        const mapped = result.resources.map(item => ({
          id: item.public_id,
          url: item.secure_url,
          width: item.width,
          height: item.height,
          format: item.format,
        }));
        allResources.push(...mapped);
      }

      nextCursor = result.next_cursor || null;
    } catch (err) {
      console.warn(`⚠️ Error fetching resources from ${folderPath}: ${err.message}`);
      nextCursor = null;
    }
  } while (nextCursor);

  return allResources;
};

// Helper to filter direct resources only (no subfolders)
const getDirectResources = (allResources, folderPath) => {
  const pathWithSlash = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
  
  return allResources.filter(resource => {
    const idAfterFolder = resource.id.replace(pathWithSlash, '');
    return !idAfterFolder.includes('/');
  });
};

// ================== MAIN ROUTES ==================

// 📋 Get ALL categories with their images (grouped)
router.get('/categories', async (req, res) => {
  try {
    const rootFolder = "Templates";

    // Get all subfolders (categories)
    const folderResult = await cloudinary.api.sub_folders(rootFolder);

    const categories = {};

    // Fetch images for each category
    for (const folder of folderResult.folders) {
      const folderPath = `${folder.path}/`;
      const templates = await fetchFolderTemplates(folderPath, 500);
      const directTemplates = getDirectResources(templates, folder.path);

      if (directTemplates.length > 0) {
        categories[folder.name] = {
          name: folder.name,
          urlName: folder.name.replace(/ /g, '_'),
          count: directTemplates.length,
          templates: directTemplates
        };
      }
    }

    res.status(200).json({
      success: true,
      totalCategories: Object.keys(categories).length,
      totalImages: Object.values(categories).reduce((sum, cat) => sum + cat.count, 0),
      categories: categories
    });

  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 📁 Get list of all categories (lightweight - no images)
router.get('/categories/list', async (req, res) => {
  try {
    const rootFolder = "Templates";

    const folderResult = await cloudinary.api.sub_folders(rootFolder);

    const categoriesWithCounts = await Promise.all(
      folderResult.folders.map(async (folder) => {
        try {
          const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: `${folder.path}/`,
            max_results: 1
          });

          return {
            name: folder.name,
            urlName: folder.name.replace(/ /g, '_'),
            path: folder.path,
            count: result.total_count || 0
          };
        } catch (err) {
          return {
            name: folder.name,
            urlName: folder.name.replace(/ /g, '_'),
            path: folder.path,
            count: 0
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      totalCategories: categoriesWithCounts.length,
      categories: categoriesWithCounts
    });

  } catch (error) {
    console.error('❌ Error fetching category list:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 🎯 Get templates from specific category
router.get('/category/:categoryName', async (req, res) => {
  try {
    const rootFolder = "Templates";
    const categoryName = decodeURIComponent(req.params.categoryName).replace(/_/g, ' ');

    console.log(`📂 Fetching category: ${categoryName}`);

    const folderPath = `${rootFolder}/${categoryName}/`;
    const allTemplates = await fetchFolderTemplates(folderPath, 500);
    const directTemplates = getDirectResources(allTemplates, `${rootFolder}/${categoryName}`);

    if (!directTemplates.length) {
      return res.status(404).json({
        success: false,
        message: `No templates found in category "${categoryName}"`,
        category: categoryName
      });
    }

    res.status(200).json({
      success: true,
      category: categoryName,
      count: directTemplates.length,
      templates: directTemplates
    });

  } catch (error) {
    console.error('❌ Error fetching category:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 🔍 Search/filter templates across all categories
router.get('/search', async (req, res) => {
  try {
    const { category, format, minWidth, minHeight } = req.query;
    const rootFolder = "Templates";

    let results = [];

    if (category) {
      // Search in specific category
      const folderPath = `${rootFolder}/${category}/`;
      results = await fetchFolderTemplates(folderPath, 500);
    } else {
      // Search across all categories
      results = await fetchFolderTemplates(`${rootFolder}/`, 500);
    }

    // Apply filters
    let filtered = results;

    if (format) {
      filtered = filtered.filter(img => img.format === format.toLowerCase());
    }

    if (minWidth) {
      filtered = filtered.filter(img => img.width >= parseInt(minWidth));
    }

    if (minHeight) {
      filtered = filtered.filter(img => img.height >= parseInt(minHeight));
    }

    res.status(200).json({
      success: true,
      filters: { category, format, minWidth, minHeight },
      count: filtered.length,
      templates: filtered
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 🔧 Utility: Get all templates (flat list)
router.get('/all', async (req, res) => {
  try {
    const rootFolder = "Templates";
    const templates = await fetchFolderTemplates(`${rootFolder}/`, 500);

    res.status(200).json({
      success: true,
      count: templates.length,
      templates: templates
    });

  } catch (error) {
    console.error('❌ Error fetching all templates:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 🐛 Debug: View all Cloudinary resources
router.get('/debug/all', async (req, res) => {
  try {
    let allResources = [];
    let nextCursor = null;

    do {
      const result = await cloudinary.api.resources({
        type: 'upload',
        max_results: 500,
        next_cursor: nextCursor,
      });

      if (result.resources?.length) {
        const mapped = result.resources.map(item => ({
          id: item.public_id,
          url: item.secure_url,
          folder: item.public_id.includes('/') 
            ? item.public_id.substring(0, item.public_id.lastIndexOf('/'))
            : 'root',
          width: item.width,
          height: item.height,
          format: item.format,
        }));
        allResources.push(...mapped);
      }

      nextCursor = result.next_cursor || null;
    } while (nextCursor);

    // Group by folder
    const grouped = {};
    allResources.forEach(resource => {
      const folder = resource.folder;
      if (!grouped[folder]) {
        grouped[folder] = [];
      }
      grouped[folder].push(resource);
    });

    res.status(200).json({
      totalResources: allResources.length,
      totalFolders: Object.keys(grouped).length,
      folders: Object.keys(grouped).sort(),
      resourcesByFolder: grouped
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;