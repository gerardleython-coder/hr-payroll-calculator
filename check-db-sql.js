require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('\n=== EMPLOYEES ===');
  const employees = await client.query('SELECT * FROM "Employee" ORDER BY "createdAt"');
  console.table(employees.rows);

  console.log('\n=== CONTRACTS ===');
  const contracts = await client.query('SELECT * FROM "Contract" ORDER BY "createdAt"');
  console.table(contracts.rows);

  console.log('\n=== PAYROLL RUNS ===');
  const runs = await client.query('SELECT id, "employeeId", "contractId", period, gross, net, "createdAt" FROM "PayrollRun" ORDER BY "createdAt"');
  console.table(runs.rows);

  await client.end();
}

main().catch(console.error);
