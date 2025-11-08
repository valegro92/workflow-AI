// Quick database test script
// Run with: node test-db.js

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function testDatabase() {
  console.log('🔍 Testing Neon database connection...\n');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    console.log('\n💡 Create .env.local file with:');
    console.log('DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Test connection
    console.log('📡 Testing connection...');
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Connected successfully!');
    console.log(`   Time: ${result[0].current_time}`);
    console.log(`   PostgreSQL: ${result[0].pg_version.split(' ')[1]}`);

    // Check tables
    console.log('\n📋 Checking tables...');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const tableNames = tables.map(t => t.table_name);
    const expectedTables = ['users', 'companies', 'workflows', 'evaluations', 'api_usage'];

    console.log(`   Found ${tableNames.length} tables: ${tableNames.join(', ') || '(none)'}`);

    const missingTables = expectedTables.filter(t => !tableNames.includes(t));

    if (missingTables.length === 0) {
      console.log('✅ All required tables exist!');

      // Count users
      const userCount = await sql`SELECT COUNT(*) as count FROM users`;
      console.log(`\n👥 Users in database: ${userCount[0].count}`);

    } else {
      console.log(`⚠️  Missing tables: ${missingTables.join(', ')}`);
      console.log('\n💡 Run migration to create tables:');
      console.log('   After deploying to Vercel, call:');
      console.log('   POST https://your-domain.vercel.app/api/db-migrate');
      console.log('   Header: X-Migration-Secret: <your-secret>');
    }

    console.log('\n✅ Database is ready to use!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Database error:', error.message);

    if (error.message.includes('connect')) {
      console.log('\n💡 Check your DATABASE_URL connection string');
    }
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('\n💡 Tables don\'t exist yet. Run the migration endpoint.');
    }

    process.exit(1);
  }
}

testDatabase();
