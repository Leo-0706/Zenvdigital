require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  console.log('--- Checking Supabase Cloud Database Connection ---');
  if (!url || !key) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in server/.env');
    console.log('👉 Please add your Supabase credentials to server/.env and try again.');
    process.exit(1);
  }

  console.log(`Connecting to URL: ${url}`);
  const client = createClient(url, key);

  try {
    const { data, error } = await client.from('users').select('id, email, role, name, phone').limit(5);
    if (error) {
      console.error('❌ Supabase connection failed with error:');
      console.error(error.message);
      console.log('💡 Tip: Make sure you ran server/data/supabase_schema.sql in the Supabase SQL Editor.');
      process.exit(1);
    }

    console.log('✅ Successfully connected to Supabase PostgreSQL!');
    console.log('Users in database:', data);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

testConnection();
