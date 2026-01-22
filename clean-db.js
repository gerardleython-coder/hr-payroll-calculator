require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('🧹 Limpiando base de datos...\n');

  // Eliminar en orden correcto (respetando foreign keys)
  console.log('Eliminando PayrollRuns...');
  const runs = await client.query('DELETE FROM "PayrollRun" RETURNING id');
  console.log(`✅ ${runs.rowCount} PayrollRuns eliminados`);

  console.log('Eliminando Contracts...');
  const contracts = await client.query('DELETE FROM "Contract" RETURNING id');
  console.log(`✅ ${contracts.rowCount} Contracts eliminados`);

  console.log('Eliminando Employees...');
  const employees = await client.query('DELETE FROM "Employee" RETURNING id');
  console.log(`✅ ${employees.rowCount} Employees eliminados`);

  console.log('\n✨ Base de datos limpia!');
  console.log('💡 Las reglas de PayrollRule y el usuario admin se mantienen.');
  console.log('💡 Puedes crear nuevos empleados desde el frontend.');

  await client.end();
}

main().catch(console.error);
