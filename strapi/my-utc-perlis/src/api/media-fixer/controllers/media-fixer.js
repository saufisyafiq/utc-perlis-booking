'use strict';

/**
 * media-fixer controller
 */

module.exports = {
  async test(ctx) {
    ctx.body = {
      success: true,
      message: 'Media fixer API is working!',
      timestamp: new Date().toISOString()
    };
  },

  async fixUrls(ctx) {
    try {
      console.log('🚀 Starting media URL migration via API...');
      
      // Get all files from the upload plugin
      const files = await strapi.db.query('plugin::upload.file').findMany({
        select: ['id', 'url', 'formats'],
      });
      
      console.log(`📁 Found ${files.length} files to process`);
      
      let updatedCount = 0;
      const updateLog = [];
      
      for (const file of files) {
        let needsUpdate = false;
        const updates = {};
        const fileLog = { id: file.id, changes: [] };
        
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
          fileLog.changes.push({
            type: 'main_url',
            from: file.url,
            to: newUrl
          });
          console.log(`🔄 Updating URL: ${file.url} → ${newUrl}`);
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
              fileLog.changes.push({
                type: 'format_url',
                format: formatName,
                from: formatData.url,
                to: newUrl
              });
              console.log(`🔄 Updating ${formatName} URL: ${formatData.url} → ${newUrl}`);
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
          updateLog.push(fileLog);
        }
      }
      
      console.log(`✅ Successfully updated ${updatedCount} files`);
      console.log('🎉 Media URL migration completed!');
      
      // Return success response
      ctx.body = {
        success: true,
        message: `Successfully updated ${updatedCount} files`,
        totalFiles: files.length,
        updatedFiles: updatedCount,
        updateLog: updateLog
      };
      
    } catch (error) {
      console.error('❌ Error during media URL migration:', error);
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  },
};
