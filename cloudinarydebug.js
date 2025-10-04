require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function listCloudinary() {
  try {
    console.log("🔹 Fetching first 50 resources from Cloudinary...");
    const resources = await cloudinary.api.resources({
      type: "upload",
      max_results: 50,
      resource_type: "image", // you can change to "auto" if needed
    });

    if (!resources.resources || !resources.resources.length) {
      console.log("⚠️ No resources found. Check folder names or resource type.");
    } else {
      console.log(`✅ Found ${resources.resources.length} images`);
      resources.resources.slice(0, 10).forEach((res, i) => {
        console.log(
          `${i + 1}. ID: ${res.public_id}, URL: ${res.secure_url}`
        );
      });
    }

    console.log("\n🔹 Listing top-level folders...");
    const folders = await cloudinary.api.root_folders();
    console.log(folders);
  } catch (err) {
    console.error("❌ Cloudinary fetch error:", err.message || err);
  }
}

listCloudinary();
