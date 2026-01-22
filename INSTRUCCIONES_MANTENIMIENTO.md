# Instrucciones de Mantenimiento - HR Payroll Calculator

## 🚀 Levantar el Proyecto

### Backend (Puerto 3000)
```bash
cd hr-payroll-calculator
npm run start:dev
```

### Frontend (Puerto 4200)
```bash
cd hr-payroll-frontend
npm start
```

Acceder a: http://localhost:4200

---

## 🔐 Credenciales de Acceso

**Usuario:** `admin`  
**Contraseña:** `admin123`

**Token JWT:** Expira en **24 horas**

---

## 🗄️ Gestión de Base de Datos

### Ver contenido de la base de datos
```bash
node check-db-sql.js
```

### Limpiar base de datos (mantiene reglas y usuario admin)
```bash
node clean-db.js
```

### Ejecutar seed (crear reglas y usuario admin)
```bash
npx prisma db seed
```

### Resetear base de datos completamente
```bash
npx prisma migrate reset
```

---

## 🧪 Tests

### Tests unitarios
```bash
npm test
```

### Tests E2E
```bash
npm run test:e2e
```

### Cobertura
```bash
npm run test:cov
```

---

## 📊 Estado Actual de la Base de Datos

Después de ejecutar `clean-db.js`:
- ✅ PayrollRules: 4 reglas (salud, pensión, retención empleado, retención contratista)
- ✅ User: 1 usuario admin
- ❌ Employees: 0 (limpio)
- ❌ Contracts: 0 (limpio)
- ❌ PayrollRuns: 0 (limpio)

---

## ⚠️ Problemas Comunes

### "María López García" aparece en el frontend
**Causa:** Datos de tests E2E que quedaron en la base de datos.  
**Solución:** Ejecutar `node clean-db.js`

### "Pepito Pérez no aparece"
**Causa:** No existe en la base de datos.  
**Solución:** Crear el empleado desde el frontend (página Empleados)

### Backend se cae
**Causa:** Posiblemente error en código o base de datos desconectada.  
**Solución:** 
1. Verificar logs del backend
2. Verificar que PostgreSQL esté corriendo
3. Verificar DATABASE_URL en .env

### Token expirado muy rápido
**Causa:** Token configurado con tiempo corto.  
**Solución:** Ya está configurado a 24 horas en `src/auth/auth.module.ts`

---

## 📝 Flujo de Trabajo Recomendado

1. **Levantar backend y frontend**
2. **Limpiar base de datos** (si hay datos de prueba)
3. **Login con admin/admin123**
4. **Crear empleado** (ej: Pepito Pérez)
5. **Crear contrato** para el empleado
6. **Calcular nómina** para el empleado
7. **Descargar PDF** de la nómina

---

## 🔧 Configuración de Entorno

### Variables de entorno (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/hr_payroll"
JWT_SECRET="your-secret-key-here"
PORT=3000
```

### Docker (si usas docker-compose)
```bash
docker-compose up -d
```

---

## 📚 Documentación Adicional

- **HU.md**: Historias de usuario en Gherkin
- **CONTEXT.md**: Reglas de negocio y contexto del proyecto
- **README.md**: Información general del proyecto
- **ANALISIS_BONOS_DEDUCCIONES.md**: Análisis de feature de bonos/deducciones

---

## 🐛 Debugging

### Ver logs del backend en tiempo real
El backend en modo `start:dev` muestra logs automáticamente en la consola.

### Ver requests HTTP
Todos los endpoints (excepto /auth/login y /payroll/health) requieren:
```
Authorization: Bearer {token}
```

### Verificar que el backend responde
```bash
curl http://localhost:3000/payroll/health
```

Debe retornar: `{"status":"ok"}`

---

**Última actualización:** 2026-01-22  
**Token JWT:** 24 horas  
**Backend:** http://localhost:3000  
**Frontend:** http://localhost:4200
