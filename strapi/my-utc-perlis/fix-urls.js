/**
 * Standalone script to fix media URLs
 * Run with: node fix-urls.js
 */

const path = require('path');
const fs = require('fs');

// Set up the environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

async function fixMediaUrls() {
  let strapi;
  
  try {
    console.log('🚀 Starting media URL migration...');
    
    // Change to the correct directory
    process.chdir(__dirname);
    
    // Check if dist folder exists
    if (!fs.existsSync('./dist')) {
      console.log('⚠️ No dist folder found. Running npm run build first...');
      const { execSync } = require('child_process');
      execSync('npm run build', { stdio: 'inherit' });
    }
    
    // Import Strapi
    const createStrapi = require('@strapi/strapi');
    
    // Initialize Strapi instance
    strapi = createStrapi({
      distDir: path.join(__dirname, 'dist'),
      appDir: __dirname,
    });
    
    // Load Strapi
    await strapi.load();
    console.log('✅ Strapi initialized successfully');
    
    // Get all files from the upload plugin
    const files = await strapi.db.query('plugin::upload.file').findMany({
      select: ['id', 'url', 'formats'],
    });
    
    console.log(`📁 Found ${files.length} files to process`);
    
    if (files.length === 0) {
      console.log('ℹ️ No files found to update');
      return;
    }
    
    let updatedCount = 0;
    
    for (const file of files) {
      let needsUpdate = false;
      const updates = {};
      
      // Fix main URL if it contains localhost or http://
      if (file.url && (file.url.includes('localhost') || file.url.startsWith('http://'))) {
        let newUrl = file.url;
        if (newUrl.includes('localhost')) {
          newUrl = newUrl.replace(/http:\/\/localhost:\d+/, 'https://strapi.utcperlis.com');
        } else if (newUrl.startsWith('http://')) {
          newUrl = newUrl.replace('http://', 'https://');
        }
        
        updates.url = newUrl;
        needsUpdate = true;
        console.log(`🔄 Updating URL: ${file.url} → ${updates.url}`);
      }
      
      // Fix format URLs (thumbnails, etc.)
      if (file.formats) {
        const updatedFormats = { ...file.formats };
        let formatsChanged = false;
        
        for (const [formatName, formatData] of Object.entries(file.formats)) {
          if (formatData && formatData.url && (formatData.url.includes('localhost') || formatData.url.startsWith('http://'))) {
            let newUrl = formatData.url;
            if (newUrl.includes('localhost')) {
              newUrl = newUrl.replace(/http:\/\/localhost:\d+/, 'https://strapi.utcperlis.com');
            } else if (newUrl.startsWith('http://')) {
              newUrl = newUrl.replace('http://', 'https://');
            }
            
            updatedFormats[formatName] = {
              ...formatData,
              url: newUrl
            };
            formatsChanged = true;
            console.log(`🔄 Updating ${formatName} URL: ${formatData.url} → ${updatedFormats[formatName].url}`);
          }
        }
        
        if (formatsChanged) {
          updates.formats = updatedFormats;
          needsUpdate = true;
        }
      }
      
      // Update the file if needed
      if (needsUpdate) {
        await strapi.db.query('plugin::upload.file').update({
          where: { id: file.id },
          data: updates,
        });
        updatedCount++;
      }
    }
    
    console.log(`✅ Successfully updated ${updatedCount} files`);
    console.log('🎉 Media URL migration completed!');
    
  } catch (error) {
    console.error('❌ Error during media URL migration:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (strapi) {
      try {
        await strapi.destroy();
        console.log('✅ Strapi instance closed');
      } catch (destroyError) {
        console.warn('⚠️ Warning: Error closing Strapi instance:', destroyError.message);
      }
    }
    process.exit(0);
  }
}

// Run the migration
fixMediaUrls().catch((error) => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
});
