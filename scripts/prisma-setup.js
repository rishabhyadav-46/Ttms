const { PrismaClient } = require('@prisma/client');

async function setup() {
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Connected to Supabase PostgreSQL!');
    
    // Test query
    const users = await prisma.user.findMany({ take: 1 });
    console.log('📊 Database test query successful:', users.length, 'users found');
    
    await prisma.$disconnect();
    console.log('🎉 Prisma setup complete! Run `npm start` to test server.');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();

