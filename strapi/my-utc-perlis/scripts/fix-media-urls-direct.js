/**
 * Direct database script to fix media URLs after HTTPS migration
 * This script directly updates the database without loading Strapi
 */

const { Client } = require('pg');

async function fixMediaUrlsDirect() {
  let client;
  
  try {
    console.log('🚀 Starting direct database media URL migration...');
    
    // Database connection
    client = new Client({
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT || 5432,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });
    
    await client.connect();
    console.log('✅ Connected to database');
    
    // Get all files that need URL updates
    const query = `
      SELECT id, url, formats 
      FROM files 
      WHERE url LIKE '%localhost%' 
         OR url LIKE 'http://%'
         OR formats::text LIKE '%localhost%'
         OR formats::text LIKE '%http://%'
    `;
    
    const result = await client.query(query);
    const files = result.rows;
    
    console.log(`📁 Found ${files.length} files to process`);
    
    let updatedCount = 0;
    
    for (const file of files) {
      let needsUpdate = false;
      const updates = [];
      const params = [];
      let paramIndex = 1;
      
      // Fix main URL
      if (file.url && (file.url.includes('localhost') || file.url.startsWith('http://'))) {
        let newUrl = file.url;
        if (newUrl.includes('localhost')) {
          newUrl = newUrl.replace(/http:\/\/localhost:\d+/, 'https://strapi.utcperlis.com');
        } else if (newUrl.startsWith('http://')) {
          newUrl = newUrl.replace('http://', 'https://');
        }
        
        updates.push(`url = $${paramIndex}`);
        params.push(newUrl);
        paramIndex++;
        needsUpdate = true;
        console.log(`🔄 Updating URL: ${file.url} → ${newUrl}`);
      }
      
      // Fix format URLs
      if (file.formats) {
        let formats;
        try {
          formats = typeof file.formats === 'string' ? JSON.parse(file.formats) : file.formats;
        } catch (e) {
          console.warn(`⚠️ Could not parse formats for file ${file.id}:`, e.message);
          continue;
        }
        
        let formatsChanged = false;
        const updatedFormats = { ...formats };
        
        for (const [formatName, formatData] of Object.entries(formats)) {
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
            console.log(`🔄 Updating ${formatName} URL: ${formatData.url} → ${newUrl}`);
          }
        }
        
        if (formatsChanged) {
          updates.push(`formats = $${paramIndex}`);
          params.push(JSON.stringify(updatedFormats));
          paramIndex++;
          needsUpdate = true;
        }
      }
      
      // Update the file if needed
      if (needsUpdate) {
        const updateQuery = `UPDATE files SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
        params.push(file.id);
        
        await client.query(updateQuery, params);
        updatedCount++;
      }
    }
    
    console.log(`✅ Successfully updated ${updatedCount} files`);
    console.log('🎉 Media URL migration completed!');
    
  } catch (error) {
    console.error('❌ Error during media URL migration:', error);
    throw error;
  } finally {
    if (client) {
      await client.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  fixMediaUrlsDirect()
    .then(() => {
      console.log('✨ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMediaUrlsDirect };
