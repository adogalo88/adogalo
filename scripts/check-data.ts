import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    include: {
      milestones: true,
      termins: true,
      adminData: true,
    }
  });
  
  console.log('=== Projects ===');
  console.log(`Total: ${projects.length}`);
  
  for (const p of projects) {
    console.log(`\n- ${p.judul} (${p.id})`);
    console.log(`  Budget: ${p.baseTotal?.toLocaleString('id-ID') || 0}`);
    console.log(`  Milestones: ${p.milestones.length}`);
    console.log(`  Termins: ${p.termins.length}`);
    if (p.adminData) {
      console.log(`  Client Funds: ${p.adminData.clientFunds?.toLocaleString('id-ID') || 0}`);
      console.log(`  Vendor Paid: ${p.adminData.vendorPaid?.toLocaleString('id-ID') || 0}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
