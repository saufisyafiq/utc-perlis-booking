/**
 * Strapi command to fix media URLs after HTTPS migration
 * Run with: npm run strapi fix-media-urls
 */

'use strict';

module.exports = ({ command }) => {
  command
    .command('fix-media-urls')
    .description('Fix media URLs from HTTP to HTTPS after domain migration')
    .action(async () => {
      try {
        console.log('🚀 Starting media URL migration...');
        
        // Get Strapi instance
        const strapi = global.strapi || require('@strapi/strapi')();
        
        if (!strapi.isLoaded) {
          await strapi.load();
        }
        
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
        
      } catch (error) {
        console.error('❌ Error during media URL migration:', error);
        process.exit(1);
      }
    });
};
