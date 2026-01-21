require('dotenv').config();
const { Client } = require('pg');
const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Seed PayrollRules
  const rules = [
    {
      key: 'EMPLOYEE_HEALTH_PCT',
      label: 'Salud empleado (%)',
      contractType: 'EMPLOYEE',
      unit: 'PERCENT',
      value: 4,
      enabled: true,
    },
    {
      key: 'EMPLOYEE_PENSION_PCT',
      label: 'Pensión empleado (%)',
      contractType: 'EMPLOYEE',
      unit: 'PERCENT',
      value: 4,
      enabled: true,
    },
    {
      key: 'EMPLOYEE_WITHHOLDING_PCT',
      label: 'Retención empleado (%)',
      contractType: 'EMPLOYEE',
      unit: 'PERCENT',
      value: 10,
      enabled: true,
    },
    {
      key: 'CONTRACTOR_WITHHOLDING_PCT',
      label: 'Retención contratista (%)',
      contractType: 'CONTRACTOR',
      unit: 'PERCENT',
      value: 12,
      enabled: true,
    },
  ];

  for (const r of rules) {
    const id = randomUUID();
    await client.query(
      `INSERT INTO "PayrollRule" (id, key, label, "contractType", unit, value, enabled, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())
       ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, "contractType" = EXCLUDED."contractType", unit = EXCLUDED.unit, value = EXCLUDED.value, enabled = EXCLUDED.enabled, "updatedAt" = now()`,
      [id, r.key, r.label, r.contractType, r.unit, r.value, r.enabled],
    );
  }

  const res = await client.query(`SELECT * FROM "PayrollRule" ORDER BY key`);
  console.log('Payroll rules:');
  console.table(res.rows);

  // Seed Admin User with hashed password
  const adminUsername = 'admin';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const adminId = 'admin-001';

  await client.query(
    `INSERT INTO "User" (id, username, password, role, active, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,now(),now())
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, active = EXCLUDED.active, "updatedAt" = now()`,
    [adminId, adminUsername, hashedPassword, 'ADMIN', true],
  );

  const userRes = await client.query(`SELECT id, username, role, active FROM "User" WHERE username = $1`, [adminUsername]);
  console.log('\nAdmin user:');
  console.table(userRes.rows);
  console.log(`Password (plain): ${adminPassword}`);
  console.log(`Password (hash): ${hashedPassword}`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
