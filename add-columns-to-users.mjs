const SUPABASE_URL = 'https://jriffylmgviydaojzmai.supabase.co';
const SUPABASE_KEY = 'sb_secret_aHHgoXKA0_4urBrRaGQUZQ_VL4fU74z';

async function addColumnsToUsers() {
  try {
    console.log('🔗 Connecting to Supabase...');
    
    // SQL query to add missing columns
    const sqlQueries = [
      // Add password_hash column if it doesn't exist
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`,
      // Add role column if it doesn't exist (with default value 'user')
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';`,
    ];
    
    console.log('📝 Adding missing columns to users table...');
    
    for (const query of sqlQueries) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'apikey': SUPABASE_KEY,
          },
          body: JSON.stringify({ sql: query }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        console.log('⚠️  Column might already exist or error:', data);
      } else {
        console.log('✅ Column added successfully');
      }
    }
    
    console.log('\n✅ All columns are ready!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addColumnsToUsers();
