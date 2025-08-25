/**
 * Script to fix media URLs after HTTPS migration
 * This script updates all existing file URLs from HTTP to HTTPS
 */

async function fixMediaUrls() {
  let strapi;
  
  try {
    console.log('🚀 Starting media URL migration...');
    
    // Initialize Strapi (v5 compatible)
    const Strapi = require('@strapi/strapi');
    strapi = new Strapi({ distDir: './dist' });
    await strapi.load();
    
    console.log('✅ Strapi initialized successfully');
    
    // Get all files from the upload plugin
    const files = await strapi.db.query('plugin::upload.file').findMany({
      select: ['id', 'url', 'formats'],
    });
    
    console.log(`📁 Found ${files.length} files to process`);
    
    let updatedCount = 0;
    
    for (const file of files) {
      let needsUpdate = false;
      const updates = {};
      
      // Fix main URL if it contains localhost or http://
      if (file.url && (file.url.includes('localhost') || file.url.startsWith('http://'))) {
        // Replace localhost or http with the correct HTTPS URL
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
          if (formatData.url && (formatData.url.includes('localhost') || formatData.url.startsWith('http://'))) {
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
    throw error;
  } finally {
    // Close Strapi properly
    if (strapi) {
      try {
        await strapi.destroy();
        console.log('✅ Strapi instance closed');
      } catch (destroyError) {
        console.warn('⚠️ Warning: Error closing Strapi instance:', destroyError.message);
      }
    }
  }
}

// Run the migration
if (require.main === module) {
  fixMediaUrls()
    .then(() => {
      console.log('✨ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMediaUrls };
