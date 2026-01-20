# Project Context — hr-payroll-calculator

Resumen conciso del repositorio para uso por herramientas de IA y nuevos desarrolladores.

## Propósito
- API NestJS para calcular nómina (salario neto) a partir de salario base, bonos y deducciones.
- Enfoque en Clean-ish Architecture (domain, application, presentation).
- Reglas de impuestos/deducciones son ficticias y con fines académicos.

## Estructura principal
- `src/payroll`: lógica de nómina (template method + strategies, reglas CRUD, casos de uso, controlador).
- `src/employees`: creación y listado de empleados; utilidades de cálculo relacionadas al empleado.
- `src/contracts`: creación y listado de contratos.
- `src/prisma`: integración con Prisma + filtro de excepciones.

## Modelos importantes (resumen)
- `PayrollInput` / `PayrollResult` (ver `src/payroll/domain/models/payroll.models.ts`) — input para cálculo y resultado.
- Prisma models (prisma/schema.prisma): `Employee`, `Contract`, `PayrollRun`, `PayrollRule`.

## Endpoints clave
- `POST /payroll/runs` — crear corrida de nómina y persistir `PayrollRun`.
- `GET /payroll/runs` — listar corridas.
- `GET /payroll/health` — health check.
- `GET /payroll/rules` — listar reglas.
- CRUD `POST|PUT|DELETE /payroll/rules` — gestionar reglas.
- `POST /contracts` — crear contrato.
- `POST /employees` — crear empleado.

## Reglas y algoritmo
- `PayrollCalculatorTemplate.calculate()` define el flujo: validar input → calcular gross → aplicar `TaxStrategy` → calcular deducciones obligatorias → neto.
- Strategies disponibles:
  - `EmployeeTaxStrategy` (salud 4%, pensión 4%, retención 10% sobre excedente > 2_000_000)
  - `ContractorTaxStrategy` (retención 12%)

### Reglas de negocio para HU-09: Validación de Contrato Activo

**RN-9.1: Existencia del Contrato**
- El contrato especificado en `contractId` DEBE existir en la base de datos.
- Si el contrato no existe, el sistema DEBE retornar HTTP 404 con el mensaje "Contrato no encontrado".
- Esta validación se ejecuta PRIMERO en la cadena de validaciones.

**RN-9.2: Pertenencia del Contrato al Empleado**
- El contrato DEBE pertenecer al empleado especificado en `employeeId` (validar `contract.employeeId === employeeId`).
- Si el contrato pertenece a otro empleado, el sistema DEBE retornar HTTP 400 con el mensaje "El contrato no pertenece al empleado especificado".
- Esta validación se ejecuta DESPUÉS de verificar la existencia del contrato.

**RN-9.3: Estado Activo del Contrato**
- El contrato DEBE tener el campo `active` en `true` para poder calcular nómina.
- Si el contrato existe y pertenece al empleado pero `active` es `false`, el sistema DEBE retornar HTTP 400 con el mensaje "El contrato no está activo".
- Esta validación se ejecuta DESPUÉS de verificar existencia y pertenencia.

**RN-9.4: Orden de Validación (Chain of Responsibility)**
- Las validaciones se ejecutan en el siguiente orden estricto:
  1. Existencia del contrato → 404 si falla
  2. Pertenencia al empleado → 400 si falla
  3. Estado activo → 400 si falla
- Si alguna validación falla, se detiene la cadena inmediatamente y se retorna el error correspondiente.
- Solo si TODAS las validaciones pasan, se procede con el cálculo de nómina.

**RN-9.5: No Persistencia en Caso de Error**
- Si cualquier validación falla, NO se debe persistir ningún registro en la tabla `PayrollRun`.
- El sistema debe mantener la integridad transaccional: todo o nada.
- No se deben realizar cálculos si las validaciones fallan.

**RN-9.6: Compatibilidad con Funcionalidad Existente**
- Esta validación NO modifica el algoritmo de cálculo de nómina existente (Template Method + Strategies).
- Esta validación se ejecuta ANTES del cálculo, como una precondición en el UseCase.
- Los endpoints existentes NO se modifican en su firma o contrato HTTP.
- Solo se agrega lógica de validación en `CreatePayrollRunUseCase` sin afectar otros casos de uso.

**RN-9.7: Patrón de Diseño y SOLID**
- **Patrón:** Chain of Responsibility para la cadena de validadores.
- **Single Responsibility:** Cada validador (`ContractExistsValidator`, `ContractOwnershipValidator`, `ContractActiveValidator`) tiene una única responsabilidad.
- **Open/Closed:** Se pueden agregar nuevos validadores sin modificar los existentes.
- **Interface Segregation:** Interfaz `IPayrollValidator` con un único método `validate(context): Promise<void>`.
- **Dependency Inversion:** El UseCase depende de la abstracción `IPayrollValidator[]`, no de implementaciones concretas.

### Reglas de negocio para HU-10: Autenticación JWT

**RN-10.1: Validación de Credenciales**
- El username y password son obligatorios en el payload de login.
- Las credenciales se validan contra un usuario administrador predeterminado hardcodeado.
- Usuario predeterminado: `username: "admin"`, `password: "admin123"`.
- Si las credenciales son inválidas, retornar HTTP 401 con mensaje genérico "Credenciales inválidas" (no revelar si el usuario existe o no).

**RN-10.2: Generación de Token JWT**
- Al login exitoso, generar un token JWT que contenga: `userId`, `username`, `role`.
- El token debe tener un tiempo de expiración de 8 horas (`8h`).
- La clave secreta debe obtenerse de la variable de entorno `JWT_SECRET`.
- El token se retorna en el campo `accessToken` junto con información básica del usuario.

**RN-10.3: Protección de Endpoints**
- Todos los endpoints de la API requieren autenticación JWT, excepto:
  - `POST /auth/login` (público)
  - `GET /payroll/health` (público)
- El token debe enviarse en el header HTTP: `Authorization: Bearer {token}`.
- Si el token es inválido, está malformado o ha expirado, retornar HTTP 401 con mensaje "Unauthorized".
- Si no se proporciona token, retornar HTTP 401 con mensaje "Unauthorized".

**RN-10.4: Estructura de Respuesta de Login**
- Respuesta exitosa (200):
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "admin-001",
      "username": "admin",
      "role": "ADMIN"
    }
  }
  ```
- Respuesta de error (401):
  ```json
  {
    "statusCode": 401,
    "message": "Credenciales inválidas"
  }
  ```

**RN-10.5: Seguridad**
- Nunca retornar el password en ninguna respuesta de la API.
- Los mensajes de error de autenticación deben ser genéricos para evitar enumeración de usuarios.
- El rate limiting existente (Throttler) se mantiene activo para prevenir ataques de fuerza bruta.

**RN-10.6: Patrón de Diseño y SOLID**
- **Patrón:** Strategy Pattern para la validación JWT (usando Passport.js).
- **Single Responsibility:** `LoginUseCase` solo maneja la lógica de login, `JwtStrategy` solo valida tokens.
- **Open/Closed:** Se puede extender a otros métodos de autenticación sin modificar código existente.
- **Dependency Inversion:** Los controllers dependen de abstracciones (UseCases), no de implementaciones concretas.

## Donde empezar para entender el dominio
- Lógica de cálculo: `src/payroll/domain/services/payroll.calculator.template.ts`
- Estrategias: `src/payroll/domain/services/tax.strategy.ts`
- Reglas persistidas: `src/payroll/domain/repositories/payroll-rule.repository.ts`
- Casos de uso: `src/payroll/application/use-cases`

## DTOs y ejemplos de payload

- `CreatePayrollRunDto` (POST /payroll/runs)
  - Campos: `employeeId` (UUID), `period` (YYYY-MM), `contractId?`, `bonuses?`, `otherDeductions?`
  - Ejemplo:

```json
{
  "employeeId": "00000000-0000-0000-0000-000000000001",
  "period": "2026-01",
  "bonuses": 200000,
  "otherDeductions": 0
}
```

- `CalculatePayrollDto` (interno / ad-hoc)
  - Campos: `contractType` (EMPLOYEE|CONTRACTOR), `baseSalary`, `bonuses?`, `otherDeductions?`
  - Ejemplo:

```json
{
  "contractType": "EMPLOYEE",
  "baseSalary": 2500000,
  "bonuses": 200000
}
```

- `CreatePayrollRuleDto` / `UpdatePayrollRuleDto`
  - Campos: `key`, `label`, `contractType?`, `unit` (PERCENT|AMOUNT), `value`, `enabled?`

## Pruebas (tests)

- Tipos presentes en el repositorio:
  - **Unit tests:** localizados principalmente en `src/**` como `*.spec.ts`. Se centran en lógica de dominio, use-cases y repositorios (muchos mockean dependencias).
  - **Integration / Light integration tests:** algunos tests dentro de `src` pueden usar `PrismaService` o crear instancias de servicios completos; se comportan como pruebas de integración a bajo nivel.
  - **End-to-end (e2e):** en `test/` (archivos `*.e2e-spec.ts`) arrancan la aplicación Nest completa y ejercen los endpoints HTTP con `supertest`.

- Archivos relevantes (ejemplos):
  - E2E: `test/payroll.e2e-spec.ts`, `test/employees.e2e-spec.ts`, `test/contracts.e2e-spec.ts`.
  - Unit: `src/payroll/domain/services/payroll.calculator.template.spec.ts`, `src/payroll/domain/repositories/payroll-rule.repository.spec.ts`, `src/employees/**/*.spec.ts`, `src/contracts/**/*.spec.ts`, etc.

- Cómo ejecutarlas (scripts en `package.json`):
  - `npm test` — ejecuta Jest para los tests definidos en `src` (configuración principal en `package.json`).
  - `npm run test:e2e` — ejecuta Jest con `test/jest-e2e.json` (pattern `.e2e-spec.ts$`) para los e2e.
  - `npm run test:cov` — genera cobertura (carpeta `coverage/`).

- Notas importantes sobre E2E:
  - Los e2e arrancan `AppModule` completo en memoria y usan `PrismaService` real para limpiar y consultar la DB (`deleteMany`, `findMany`, etc.).
  - Para ejecutar e2e necesitas una base de datos PostgreSQL accesible y `DATABASE_URL` configurada (o adaptar tests para usar un mock). El proyecto incluye migraciones en `prisma/migrations` y `prisma/seed.js`.
  - Los e2e realizan `overrideProvider(APP_GUARD)` y `overrideProvider(ThrottlerGuard)` para evitar rate-limiting durante tests.

- Estrategia de pruebas observada:
  - Tests unitarios cubren ramas del dominio (validaciones, excepciones, comportamiento de strategies).
  - Repository tests mockean `prisma.$queryRaw` para aislar SQL.
  - E2E verifican contratos de API y flujos críticos (crear empleado → crear contrato → crear payroll run), además de casos de error (p.ej. 404, 409).

## Seguridad HTTP: uso de `helmet`

- Dónde está: `src/main.ts` aplica `helmet()` al `app` de Nest antes de exponer los endpoints.
- Qué hace (resumen): `helmet` es un middleware que configura cabeceras HTTP de seguridad comunes para proteger contra ataques web básicos. Por defecto añade/ajusta cabeceras como:
  - `Strict-Transport-Security` (HSTS) — si se sirve sobre HTTPS
  - `X-Frame-Options: DENY` — evita clickjacking
  - `X-Content-Type-Options: nosniff` — previene MIME-type sniffing
  - `Referrer-Policy` — controla el Referer enviado
  - `X-DNS-Prefetch-Control` — controla prefetching
  - `Content-Security-Policy` (en versiones o configuraciones específicas) — mitiga XSS/HTML injection

- Notas del proyecto:
  - `helmet()` se aplica sin opciones explícitas, por lo que usa la configuración por defecto. Revisar `helmet` docs si necesitas personalizar o relajar alguna cabecera (p.ej. CSP o permitir frames para embed autorizados).
  - En entornos de test (e2e) la cabecera no suele interferir en los tests automáticos con `supertest`, pero si añades políticas CSP estrictas pueden necesitar ajustes (p.ej. permitir inline scripts usados por herramientas de testing).
