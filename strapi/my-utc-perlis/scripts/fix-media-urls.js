/**
 * Script to fix media URLs after HTTPS migration
 * This script updates all existing file URLs from HTTP to HTTPS
 */

const strapi = require('@strapi/strapi');

async function fixMediaUrls() {
  try {
    console.log('🚀 Starting media URL migration...');
    
    // Initialize Strapi
    const app = await strapi().load();
    
    // Get all files from the upload plugin
    const files = await strapi.db.query('plugin::upload.file').findMany({
      select: ['id', 'url', 'formats'],
    });
    
    console.log(`📁 Found ${files.length} files to process`);
    
    let updatedCount = 0;
    
    for (const file of files) {
      let needsUpdate = false;
      const updates = {};
      
      // Fix main URL if it starts with http://
      if (file.url && file.url.startsWith('http://')) {
        updates.url = file.url.replace('http://', 'https://');
        needsUpdate = true;
        console.log(`🔄 Updating URL: ${file.url} → ${updates.url}`);
      }
      
      // Fix format URLs (thumbnails, etc.)
      if (file.formats) {
        const updatedFormats = { ...file.formats };
        let formatsChanged = false;
        
        for (const [formatName, formatData] of Object.entries(file.formats)) {
          if (formatData.url && formatData.url.startsWith('http://')) {
            updatedFormats[formatName] = {
              ...formatData,
              url: formatData.url.replace('http://', 'https://')
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
    // Close Strapi
    await strapi.destroy();
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
