/**
 * Simple media URL fixer using Strapi's internal patterns
 * Run with: node fix-media-simple.js
 */

const path = require('path');

async function main() {
  try {
    console.log('🚀 Starting media URL migration...');
    
    // Set working directory
    process.chdir(__dirname);
    
    // Try to require Strapi using the same pattern as strapi CLI
    const strapi = require('@strapi/strapi');
    
    console.log('📦 Strapi module loaded');
    
    // Create app instance
    const app = strapi({ 
      dir: __dirname,
      autoReload: false,
      serveAdminPanel: false
    });
    
    console.log('🔧 Strapi app created');
    
    // Start the app
    await app.start();
    
    console.log('✅ Strapi started successfully');
    
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
    
    // Stop the app
    await app.stop();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
