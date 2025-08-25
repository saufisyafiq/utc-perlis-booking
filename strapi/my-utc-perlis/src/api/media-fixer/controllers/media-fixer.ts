/**
 * media-fixer controller
 */

export default {
  async test(ctx) {
    ctx.body = {
      success: true,
      message: 'Media fixer API is working!',
      timestamp: new Date().toISOString()
    };
  },

  async inspect(ctx) {
    try {
      // Get all files to inspect their current URLs
      const files = await strapi.db.query('plugin::upload.file').findMany({
        select: ['id', 'name', 'url', 'formats'],
        limit: 10, // Limit to first 10 files for inspection
      });

      const inspection = files.map(file => ({
        id: file.id,
        name: file.name,
        url: file.url,
        formats: file.formats ? Object.keys(file.formats) : [],
        formatUrls: file.formats ? Object.entries(file.formats).map(([key, data]) => ({
          format: key,
          url: (data as any)?.url
        })) : []
      }));

      ctx.body = {
        success: true,
        totalFiles: files.length,
        files: inspection,
        message: 'Current media URLs inspection'
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message
      };
    }
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
      const updateLog: any[] = [];
      
      for (const file of files) {
        let needsUpdate = false;
        const updates: any = {};
        const fileLog = { id: file.id, changes: [] as any[] };
        
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
            if (formatData && (formatData as any).url && ((formatData as any).url.includes('localhost') || (formatData as any).url.startsWith('http://'))) {
              let newUrl = (formatData as any).url;
              if (newUrl.includes('localhost')) {
                newUrl = newUrl.replace(/http:\/\/localhost:\d+/, 'https://strapi.utcperlis.com');
              } else if (newUrl.startsWith('http://')) {
                newUrl = newUrl.replace('http://', 'https://');
              }
              
              updatedFormats[formatName] = {
                ...(formatData as object),
                url: newUrl
              };
              formatsChanged = true;
              fileLog.changes.push({
                type: 'format_url',
                format: formatName,
                from: (formatData as any).url,
                to: newUrl
              });
              console.log(`🔄 Updating ${formatName} URL: ${(formatData as any).url} → ${newUrl}`);
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
      
    } catch (error: any) {
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
