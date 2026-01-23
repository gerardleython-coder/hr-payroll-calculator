require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('\n=== PAYROLL RUNS CON BREAKDOWN ===');
  const runs = await client.query('SELECT id, "employeeId", period, gross, net, breakdown FROM "PayrollRun" ORDER BY "createdAt" DESC LIMIT 5');
  
  for (const run of runs.rows) {
    console.log('\n---');
    console.log('ID:', run.id);
    console.log('Period:', run.period);
    console.log('Gross:', run.gross);
    console.log('Net:', run.net);
    console.log('Breakdown:', JSON.stringify(run.breakdown, null, 2));
  }

  await client.end();
}

main().catch(console.error);
