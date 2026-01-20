# Historias de Usuario (Gherkin) — HR Payroll Calculator

> Colección de HUs para los endpoints de Payroll y Employees. Cada HU está escrita en Gherkin
> y organizada por área funcional (Payroll / Employees).

---

## Payroll — HUs principales

### HU-01 — Health check del servicio de nómina

```gherkin
Feature: HU-01 Health check del servicio de nómina
  Como consumidor de la API
  Quiero consultar un health check
  Para verificar que el servicio está levantado y responde correctamente

  Scenario: Consultar health check exitosamente
    When envío una solicitud GET a "/payroll/health"
    Then la respuesta debe tener código 200
    And el body debe contener "status" con valor "ok"
```
---

### HU-02 — Consultar reglas del cálculo (reales)

```gherkin
Feature: HU-02 Consultar reglas del cálculo (reales)
  Como consumidor de la API
  Quiero consultar las reglas configuradas del cálculo de nómina
  Para entender cómo se calculan impuestos y deducciones
  Las reglas son reales y se obtienen desde la tabla `PayrollRule` en la base de datos.

  Scenario: Consultar reglas exitosamente
    When envío una solicitud GET a "/payroll/rules"
    Then la respuesta debe tener código 200
    And el body debe incluir información de reglas para "employee"
    And el body debe incluir información de reglas para "contractor"
```

---

### HU-03 — Calcular nómina para empleado (EMPLOYEE)

```gherkin
Feature: HU-03 Calcular nómina para empleado (EMPLOYEE)
  Como usuario de RRHH
  Quiero calcular el salario neto de un empleado
  Para conocer el valor a pagar después de impuestos y deducciones

  Scenario: Calcular nómina EMPLOYEE con salario y bonos
    Given un payload válido:
      """
      { "contractType": "EMPLOYEE", "baseSalary": 2500000, "bonuses": 200000, "otherDeductions": 0 }
      """
    When envío una solicitud POST a "/payroll/runs"
    Then la respuesta debe tener código 201
    And el body debe contener "gross" con valor 2700000
    And el body debe contener "net" como número
    And el body debe contener "breakdown" con claves "health" y "pension"

  Scenario: Calcular nómina EMPLOYEE donde retención (withholding) es 0 por umbral
    Given un payload válido:
      """
      { "contractType": "EMPLOYEE", "baseSalary": 1900000, "bonuses": 0, "otherDeductions": 0 }
      """
    When envío una solicitud POST a "/payroll/runs"
    Then la respuesta debe tener código 201
    And el body debe contener "breakdown.withholding" con valor 0
```

---

### HU-04 — Calcular nómina para contratista (CONTRACTOR)

```gherkin
Feature: HU-04 Calcular nómina para contratista (CONTRACTOR)
  Como usuario de RRHH
  Quiero calcular el salario neto de un contratista
  Para conocer el valor a pagar después de retenciones y deducciones aplicables

  Scenario: Calcular nómina CONTRACTOR con salario base
    Given un payload válido:
      """
      { "contractType": "CONTRACTOR", "baseSalary": 2000000, "bonuses": 0, "otherDeductions": 0 }
      """
    When envío una solicitud POST a "/payroll/runs"
    Then la respuesta debe tener código 201
    And el body debe contener "gross" con valor 2000000
    And el body debe contener "net" como número
    And el body debe contener "breakdown.withholding" como número

  Scenario: Calcular nómina CONTRACTOR con deducciones adicionales
    Given un payload válido:
      """
      { "contractType": "CONTRACTOR", "baseSalary": 2000000, "bonuses": 0, "otherDeductions": 100000 }
      """
    When envío una solicitud POST a "/payroll/runs"
    Then la respuesta debe tener código 201
    And el body debe contener "gross" con valor 2000000
    And el body debe contener "otherDeductions" con valor 100000
    And el body debe contener "net" como número
```

---

### HU-05 — Validaciones y manejo de errores en cálculo de nómina

```gherkin
Feature: HU-05 Validaciones y manejo de errores en cálculo de nómina
  Como consumidor de la API
  Quiero recibir errores claros cuando el payload es inválido
  Para corregir la solicitud y evitar cálculos incorrectos

  Scenario: Rechazar salario base negativo
    Given un payload inválido:
      """
      { "contractType": "EMPLOYEE", "baseSalary": -1 }
      """
    When envío una solicitud POST a "/payroll/runs"
    Then la respuesta debe tener código 400

  Scenario: Rechazar deducciones adicionales mayores al gross
    Given un payload inválido:
      """
      { "contractType": "EMPLOYEE", "baseSalary": 100000, "bonuses": 0, "otherDeductions": 200000 }
      """
    When envío una solicitud POST a "/payroll/runs"
    Then la respuesta debe tener código 500
    And el mensaje de error debe contener "otherDeductions"

  Scenario: Rechazar contractType no permitido
    Given un payload inválido:
      """
      { "contractType": "FREELANCE", "baseSalary": 100000 }
      """
    When envío una solicitud POST a "/payroll/runs"
    Then la respuesta debe tener código 400

  Scenario: Rechazar request sin campos obligatorios
    Given un payload inválido:
      """
      { "contractType": "EMPLOYEE" }
      """
    When envío una solicitud POST a "/payroll/runs"
    Then la respuesta debe tener código 400
```

---

## Employees — HUs (nuevas implementaciones)

### HU-06 — Crear empleado

```gherkin
Feature: HU-06 Crear empleado
  Como consumidor de la API
  Quiero crear un registro de empleado
  Para poder administrarlo y asociarle contratos

  Scenario: Crear empleado con datos válidos
    Given un payload válido:
      """
      { "name": "María Pérez", "email": "maria.perez@example.com" }
      """
    When envío una solicitud POST a "/employees"
    Then la respuesta debe tener código 201
    And el body debe contener "id", "name", "email" y "createdAt"
```

---

### HU-07 — Listar empleados

```gherkin
Feature: HU-07 Listar empleados
  Como consumidor de la API
  Quiero obtener la lista de empleados
  Para consultarla en un panel administrativo

  Scenario: Obtener lista de empleados
    When envío una solicitud GET a "/employees"
    Then la respuesta debe tener código 200
    And el body debe ser un array de objetos con claves "id", "name", "email", "createdAt"
```

---

### HU-08 — Procesar empleado con Template + Strategy

```gherkin
Feature: HU-08 Procesar empleado (Template + Strategy)
  Como usuario de RRHH
  Quiero ejecutar la lógica de procesamiento de empleado que aplica estrategias
  Para producir un objeto empleado enriquecido (id, createdAt, validaciones)

  Scenario: Procesar empleado válido
    Given un payload válido:
      """
      { "name": "Carlos López", "email": "carlos.lopez@example.com" }
      """
    When envío una solicitud POST a "/employees/process"
    Then la respuesta debe tener código 201
    And el body debe contener "id", "name", "email", "createdAt"

  Scenario: Procesar empleado con falta de campos
    Given un payload inválido:
      """
      { "name": "" }
      """
    When envío una solicitud POST a "/employees/process"
    Then la respuesta debe tener código 400
```

---

### HU-09 — Validación de Contrato Activo para Cálculo de Nómina

```gherkin
Feature: HU-09 Validación de Contrato Activo para Cálculo de Nómina
  Como usuario del sistema de nómina
  Quiero que el sistema valide que un empleado tenga un contrato activo antes de calcular su nómina
  Para evitar errores de cálculo en empleados sin contrato vigente y garantizar la integridad de los datos

  Background:
    Given existe un empleado con id válido en el sistema
    And el empleado tiene un email registrado

  Scenario: Calcular nómina con contrato activo exitosamente
    Given el empleado tiene un contrato activo
    And el contrato tiene tipo "EMPLOYEE"
    And el contrato tiene salario base de 3000000
    And el contrato pertenece al empleado especificado
    When envío una solicitud POST a "/payroll/runs" con employeeId y contractId válidos
    Then la respuesta debe tener código 201
    And el body debe contener "gross", "net" y "breakdown"
    And se debe persistir un registro en la tabla PayrollRun

  Scenario: Rechazar cálculo de nómina con contrato inactivo
    Given el empleado tiene un contrato registrado
    And el contrato tiene el campo "active" en false
    When envío una solicitud POST a "/payroll/runs" con el contractId inactivo
    Then la respuesta debe tener código 400
    And el mensaje de error debe ser "El contrato no está activo"
    And no se debe persistir ningún registro en PayrollRun

  Scenario: Rechazar cálculo de nómina con contrato inexistente
    Given el empleado existe en el sistema
    And no existe un contrato con el contractId especificado
    When envío una solicitud POST a "/payroll/runs" con un contractId inexistente
    Then la respuesta debe tener código 404
    And el mensaje de error debe ser "Contrato no encontrado"
    And no se debe persistir ningún registro en PayrollRun

  Scenario: Rechazar cálculo de nómina con contrato de otro empleado
    Given el empleado existe en el sistema
    And existe un contrato activo en la base de datos
    But el contrato pertenece a un empleado diferente
    When envío una solicitud POST a "/payroll/runs" con el contractId de otro empleado
    Then la respuesta debe tener código 400
    And el mensaje de error debe ser "El contrato no pertenece al empleado especificado"
    And no se debe persistir ningún registro en PayrollRun
```

---

### Notas
- Estas HUs reflejan las implementaciones actuales de `payroll` y las nuevas rutas/servicios de `employees`.
- Mantener los escenarios como contratos de alto nivel; los tests e2e concretos deben mapearse a estos HUs.
- Las reglas de cálculo ya no son ficticias: se almacenan en la tabla `PayrollRule`.
- El proyecto incluye un script de siembra para asegurar las reglas iniciales en la base de datos: ejecutar:

```bash
npx prisma db seed
# (o `node prisma/seed.js` manualmente)
```

  Este script usa upsert para ser idempotente y puede ejecutarse tanto en desarrollo como en CI después de aplicar las migraciones.
