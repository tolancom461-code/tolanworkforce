import bcryptjs from 'bcryptjs';

const SUPABASE_URL = 'https://jriffylmgviydaojzmai.supabase.co';
const SUPABASE_KEY = 'sb_secret_aHHgoXKA0_4urBrRaGQUZQ_VL4fU74z';

async function addAdminUser() {
  try {
    console.log('🔗 Connecting to Supabase via REST API...');
    
    // Hash password using bcryptjs
    const password = 'admin123';
    const passwordHash = await bcryptjs.hash(password, 10);
    
    console.log('✅ Password hashed successfully');
    console.log('📝 Adding Admin user...');
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          username: 'admin',
          email: 'admin@tolanworkforce.com',
          full_name: 'Administrator',
          password_hash: passwordHash,
          role: 'admin',
        }),
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error response:', data);
      
      // Try update if insert failed due to conflict
      if (data.code === '23505' || data.message?.includes('duplicate')) {
        console.log('📝 User exists, updating...');
        
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/users?username=eq.admin`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'apikey': SUPABASE_KEY,
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              full_name: 'Administrator',
              password_hash: passwordHash,
              role: 'admin',
            }),
          }
        );
        
        const updateData = await updateResponse.json();
        if (updateResponse.ok) {
          console.log('✅ Admin user updated successfully!');
          console.log('📊 User details:', updateData[0]);
        } else {
          console.error('❌ Update failed:', updateData);
        }
      }
    } else {
      console.log('✅ Admin user added successfully!');
      console.log('📊 User details:', data[0]);
    }
    
    console.log('\n🎉 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addAdminUser();
