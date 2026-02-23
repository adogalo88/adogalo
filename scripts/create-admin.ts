import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'aplikasipunyowongkito@gmail.com';
  
  // Check if admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });
  
  if (existingAdmin) {
    console.log('Admin already exists:', existingAdmin);
    return;
  }
  
  // Create admin
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      nama: 'Admin Adogalo',
      role: 'admin',
      projectIds: '[]'
    }
  });
  
  console.log('Admin created successfully:', admin);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
