require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  console.log('\n=== EMPLOYEES ===');
  const employees = await prisma.employee.findMany();
  console.table(employees);
  
  console.log('\n=== CONTRACTS ===');
  const contracts = await prisma.contract.findMany();
  console.table(contracts);
  
  console.log('\n=== PAYROLL RUNS ===');
  const runs = await prisma.payrollRun.findMany();
  console.table(runs);
  
  await prisma.$disconnect();
}

main().catch(console.error);
