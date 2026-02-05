import postgres from 'postgres';
import bcryptjs from 'bcryptjs';

const SUPABASE_URL = 'https://jriffylmgviydaojzmai.supabase.co';
const DB_CONNECTION = 'postgresql://postgres:radmanD11admi@db.jriffylmgviydaojzmai.supabase.co:5432/postgres';

async function addAdminUser() {
  const sql = postgres(DB_CONNECTION);
  
  try {
    console.log('🔗 Connecting to Supabase...');
    
    // Hash password using bcryptjs
    const password = 'admin123';
    const passwordHash = await bcryptjs.hash(password, 10);
    
    console.log('✅ Password hashed successfully');
    console.log('📝 Adding Admin user...');
    
    // Insert admin user
    const result = await sql`
      INSERT INTO users (username, email, name, passwordHash, role, loginMethod, createdAt, updatedAt, lastSignedIn)
      VALUES (
        'admin',
        'admin@tolanworkforce.com',
        'Administrator',
        ${passwordHash},
        'admin',
        'local',
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (username) DO UPDATE SET
        passwordHash = ${passwordHash},
        updatedAt = NOW(),
        lastSignedIn = NOW()
      RETURNING id, username, email, role;
    `;
    
    console.log('✅ Admin user added/updated successfully!');
    console.log('📊 User details:', result[0]);
    console.log('\n🎉 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addAdminUser();
