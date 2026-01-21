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

---

### HU-10 — Autenticación JWT para Administrador

```gherkin
Feature: HU-10 Autenticación JWT para Administrador
  Como administrador del sistema
  Quiero autenticarme con usuario y contraseña
  Para acceder de forma segura a los endpoints de la API

  Background:
    Given existe un usuario administrador predeterminado
    And el usuario tiene username "admin" y password "admin123"

  Scenario: Login exitoso con credenciales válidas
    Given un payload válido:
      """
      { "username": "admin", "password": "admin123" }
      """
    When envío una solicitud POST a "/auth/login"
    Then la respuesta debe tener código 200
    And el body debe contener "accessToken" como string
    And el body debe contener "user" con "username" y "role"

  Scenario: Login fallido con contraseña incorrecta
    Given un payload con contraseña incorrecta:
      """
      { "username": "admin", "password": "wrongpassword" }
      """
    When envío una solicitud POST a "/auth/login"
    Then la respuesta debe tener código 401
    And el mensaje debe ser "Credenciales inválidas"

  Scenario: Login fallido con usuario inexistente
    Given un payload con usuario inexistente:
      """
      { "username": "noexiste", "password": "admin123" }
      """
    When envío una solicitud POST a "/auth/login"
    Then la respuesta debe tener código 401
    And el mensaje debe ser "Credenciales inválidas"

  Scenario: Acceso a endpoint protegido sin token
    When envío una solicitud GET a "/payroll/runs" sin header Authorization
    Then la respuesta debe tener código 401
    And el mensaje debe contener "Unauthorized"

  Scenario: Acceso a endpoint protegido con token válido
    Given tengo un token JWT válido obtenido del login
    When envío una solicitud GET a "/payroll/runs" con header "Authorization: Bearer {token}"
    Then la respuesta debe tener código 200
    And debo recibir la lista de payroll runs

  Scenario: Acceso a endpoint protegido con token inválido
    Given tengo un token JWT inválido o malformado
    When envío una solicitud GET a "/payroll/runs" con header "Authorization: Bearer {token}"
    Then la respuesta debe tener código 401
    And el mensaje debe contener "Unauthorized"
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


---

### HU-11 — Actualizar Empleado

```gherkin
Feature: HU-11 Actualizar Empleado
  Como usuario de RRHH
  Quiero actualizar la información de un empleado existente
  Para mantener los datos actualizados y corregir errores

  Background:
    Given existe un empleado con id válido en el sistema
    And el empleado tiene nombre "Juan Pérez" y email "juan.perez@empresa.com"

  Scenario: Actualizar nombre de empleado exitosamente
    Given el empleado existe en la base de datos
    When envío una solicitud PATCH a "/employees/{id}" con body:
      """
      { "name": "Juan Carlos Pérez" }
      """
    Then la respuesta debe tener código 200
    And el body debe contener "name" con valor "Juan Carlos Pérez"
    And el body debe contener "email" con valor "juan.perez@empresa.com"
    And el campo "updatedAt" debe ser actualizado

  Scenario: Actualizar email de empleado exitosamente
    Given el empleado existe en la base de datos
    And no existe otro empleado con email "juan.carlos@empresa.com"
    When envío una solicitud PATCH a "/employees/{id}" con body:
      """
      { "email": "juan.carlos@empresa.com" }
      """
    Then la respuesta debe tener código 200
    And el body debe contener "email" con valor "juan.carlos@empresa.com"
    And el campo "updatedAt" debe ser actualizado

  Scenario: Actualizar nombre y email simultáneamente
    Given el empleado existe en la base de datos
    And no existe otro empleado con email "jc.perez@empresa.com"
    When envío una solicitud PATCH a "/employees/{id}" con body:
      """
      { "name": "Juan C. Pérez", "email": "jc.perez@empresa.com" }
      """
    Then la respuesta debe tener código 200
    And el body debe contener "name" con valor "Juan C. Pérez"
    And el body debe contener "email" con valor "jc.perez@empresa.com"
    And el campo "updatedAt" debe ser actualizado

  Scenario: Rechazar actualización con email duplicado
    Given el empleado existe en la base de datos
    And existe otro empleado con email "maria.lopez@empresa.com"
    When envío una solicitud PATCH a "/employees/{id}" con body:
      """
      { "email": "maria.lopez@empresa.com" }
      """
    Then la respuesta debe tener código 409
    And el mensaje debe contener "Email ya está en uso"
    And el empleado NO debe ser actualizado en la base de datos

  Scenario: Rechazar actualización con email inválido
    Given el empleado existe en la base de datos
    When envío una solicitud PATCH a "/employees/{id}" con body:
      """
      { "email": "email-invalido" }
      """
    Then la respuesta debe tener código 400
    And el mensaje debe contener "Email inválido"

  Scenario: Rechazar actualización con nombre vacío
    Given el empleado existe en la base de datos
    When envío una solicitud PATCH a "/employees/{id}" con body:
      """
      { "name": "" }
      """
    Then la respuesta debe tener código 400
    And el mensaje debe contener "Nombre es requerido"

  Scenario: Rechazar actualización de empleado inexistente
    Given NO existe un empleado con id "00000000-0000-0000-0000-000000000000"
    When envío una solicitud PATCH a "/employees/00000000-0000-0000-0000-000000000000" con body:
      """
      { "name": "Nuevo Nombre" }
      """
    Then la respuesta debe tener código 404
    And el mensaje debe contener "Empleado no encontrado"

  Scenario: Actualización sin cambios (idempotente)
    Given el empleado existe en la base de datos
    When envío una solicitud PATCH a "/employees/{id}" con body:
      """
      { "name": "Juan Pérez", "email": "juan.perez@empresa.com" }
      """
    Then la respuesta debe tener código 200
    And el body debe contener los mismos valores
    And el campo "updatedAt" debe ser actualizado
```

---

### HU-12 — Actualizar Contrato

```gherkin
Feature: HU-12 Actualizar Contrato
  Como usuario de RRHH
  Quiero actualizar la información de un contrato existente
  Para ajustar salarios, cambiar estados o corregir errores

  Background:
    Given existe un empleado con id válido en el sistema
    And el empleado tiene un contrato activo
    And el contrato tiene tipo "EMPLOYEE" y salario base 3000000

  Scenario: Actualizar salario base exitosamente
    Given el contrato existe en la base de datos
    When envío una solicitud PATCH a "/contracts/{id}" con body:
      """
      { "baseSalary": 3500000 }
      """
    Then la respuesta debe tener código 200
    And el body debe contener "baseSalary" con valor 3500000
    And el campo "updatedAt" debe ser actualizado

  Scenario: Cambiar estado de activo a inactivo
    Given el contrato existe y está activo
    When envío una solicitud PATCH a "/contracts/{id}" con body:
      """
      { "active": false }
      """
    Then la respuesta debe tener código 200
    And el body debe contener "active" con valor false
    And el campo "updatedAt" debe ser actualizado

  Scenario: Cambiar estado de inactivo a activo
    Given el contrato existe y está inactivo
    When envío una solicitud PATCH a "/contracts/{id}" con body:
      """
      { "active": true }
      """
    Then la respuesta debe tener código 200
    And el body debe contener "active" con valor true
    And el campo "updatedAt" debe ser actualizado

  Scenario: Cambiar tipo de contrato de EMPLOYEE a CONTRACTOR
    Given el contrato existe con tipo "EMPLOYEE"
    When envío una solicitud PATCH a "/contracts/{id}" con body:
      """
      { "contractType": "CONTRACTOR" }
      """
    Then la respuesta debe tener código 200
    And el body debe contener "contractType" con valor "CONTRACTOR"
    And el campo "updatedAt" debe ser actualizado

  Scenario: Actualizar múltiples campos simultáneamente
    Given el contrato existe en la base de datos
    When envío una solicitud PATCH a "/contracts/{id}" con body:
      """
      { "baseSalary": 4000000, "active": true, "contractType": "EMPLOYEE" }
      """
    Then la respuesta debe tener código 200
    And el body debe contener "baseSalary" con valor 4000000
    And el body debe contener "active" con valor true
    And el body debe contener "contractType" con valor "EMPLOYEE"
    And el campo "updatedAt" debe ser actualizado

  Scenario: Rechazar actualización con salario negativo
    Given el contrato existe en la base de datos
    When envío una solicitud PATCH a "/contracts/{id}" con body:
      """
      { "baseSalary": -1000 }
      """
    Then la respuesta debe tener código 400
    And el mensaje debe contener "Salario debe ser mayor a 0"

  Scenario: Rechazar actualización con salario cero
    Given el contrato existe en la base de datos
    When envío una solicitud PATCH a "/contracts/{id}" con body:
      """
      { "baseSalary": 0 }
      """
    Then la respuesta debe tener código 400
    And el mensaje debe contener "Salario debe ser mayor a 0"

  Scenario: Rechazar actualización con tipo de contrato inválido
    Given el contrato existe en la base de datos
    When envío una solicitud PATCH a "/contracts/{id}" con body:
      """
      { "contractType": "FREELANCE" }
      """
    Then la respuesta debe tener código 400
    And el mensaje debe contener "Tipo de contrato inválido"

  Scenario: Rechazar actualización de contrato inexistente
    Given NO existe un contrato con id "00000000-0000-0000-0000-000000000000"
    When envío una solicitud PATCH a "/contracts/00000000-0000-0000-0000-000000000000" con body:
      """
      { "baseSalary": 3500000 }
      """
    Then la respuesta debe tener código 404
    And el mensaje debe contener "Contrato no encontrado"

  Scenario: Actualización sin cambios (idempotente)
    Given el contrato existe en la base de datos
    When envío una solicitud PATCH a "/contracts/{id}" con los mismos valores actuales
    Then la respuesta debe tener código 200
    And el body debe contener los mismos valores
    And el campo "updatedAt" debe ser actualizado

  Scenario: Verificar que contratos de nómina existentes no se afectan
    Given el contrato tiene nóminas procesadas asociadas
    When envío una solicitud PATCH a "/contracts/{id}" con body:
      """
      { "baseSalary": 3500000 }
      """
    Then la respuesta debe tener código 200
    And las nóminas existentes NO deben ser modificadas
    And solo el contrato debe ser actualizado
```

---
