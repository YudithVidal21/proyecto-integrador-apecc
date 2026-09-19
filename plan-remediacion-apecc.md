# 🛡️ PLAN DE REMEDIACIÓN COMPLETO - APECC MATRÍCULAS EN LÍNEA

**Documento Ejecutivo de Corrección de Vulnerabilidades**  
**Versión:** 1.0  
**Fecha:** Septiembre 2026  
**Clasificación:** Interno - Equipo Técnico

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen del Plan](#resumen-del-plan)
2. [Fases de Implementación](#fases-de-implementación)
3. [Fase 1: Seguridad Crítica (1-2 Semanas)](#fase-1-seguridad-crítica)
4. [Fase 2: Seguridad Avanzada (2-4 Semanas)](#fase-2-seguridad-avanzada)
5. [Fase 3: Hardening y Compliance (4-8 Semanas)](#fase-3-hardening-y-compliance)
6. [Testing y Validación](#testing-y-validación)
7. [Rollout a Producción](#rollout-a-producción)
8. [Mantenimiento Continuo](#mantenimiento-continuo)

---

## 🎯 RESUMEN DEL PLAN {#resumen-del-plan}

### Objetivos Generales

| Objetivo | Métrica de Éxito | Prioridad |
|----------|------------------|-----------|
| Implementar autenticación y autorización | 100% endpoints protegidos | 🔴 CRÍTICA |
| Cifrar datos sensibles | 0 datos en texto plano en BD | 🔴 CRÍTICA |
| Habilitar HTTPS/TLS | Certificado válido, A+ en SSL Labs | 🔴 CRÍTICA |
| Restringir CORS | Solo dominios autorizados | 🔴 CRÍTICA |
| Validación robusta | 100% input validado servidor | 🔴 CRÍTICA |
| Auditoría y logging | Log de cada acción sensible | 🟡 ALTA |
| Backups seguros | Diarios, encriptados, probados | 🟡 ALTA |
| Monitoreo 24/7 | Alertas en tiempo real | 🟡 ALTA |

### Timeline General

```
Semana 1-2:  ████████░░ Seguridad Crítica (40% completado)
Semana 3-4:  ████████████████░░ Seguridad Avanzada (40% más)
Semana 5-6:  ████████████████████ Hardening (20% final)
            ────────────────────
Total:       12 semanas, 8-10 personas, USD $50K-80K
```

### Recursos Requeridos

**Personal:**
- 1x Líder Técnico (Security Lead)
- 2x Backend Developers
- 1x DevOps/Infrastructure
- 1x QA/Testing
- 1x Security Auditor (externo, semanas 8-12)

**Herramientas:**
- OWASP ZAP (gratuito)
- Burp Suite Community (gratuito)
- SonarQube (gratuito)
- Snyk (freemium)
- npm audit (integrado)

---

## 📅 FASES DE IMPLEMENTACIÓN {#fases-de-implementación}

### Estructura General

```
┌─────────────────────────────────────────────────────┐
│ FASE 1: CRÍTICA (Semanas 1-2)                       │
│ • Autenticación JWT                                 │
│ • HTTPS/TLS                                          │
│ • Encriptación BD                                    │
│ • CORS restringido                                   │
│ • Validación básica                                  │
│ Objetivo: Proteger acceso y datos en reposo         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ FASE 2: AVANZADA (Semanas 3-6)                      │
│ • Rate Limiting                                      │
│ • CSRF Protection                                    │
│ • Logging centralizado                              │
│ • Validación robusta                                 │
│ • Backups encriptados                               │
│ Objetivo: Prevenir ataques y auditar acciones       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ FASE 3: HARDENING (Semanas 7-12)                    │
│ • 2FA para admins                                    │
│ • WAF (ModSecurity)                                  │
│ • PostgreSQL migration                              │
│ • Certificación SOC 2                               │
│ Objetivo: Máxima seguridad y compliance             │
└─────────────────────────────────────────────────────┘
```

---

## ⚡ FASE 1: SEGURIDAD CRÍTICA {#fase-1-seguridad-crítica}

**Timeline:** 7-10 días  
**Equipo:** 2 Developers + 1 DevOps  
**Objetivo:** Proteger acceso y datos en reposo

### Tarea 1.1: Implementar Autenticación JWT

**Responsable:** Developer Principal  
**Duración:** 2 días  
**Complejidad:** Media

#### 1.1.1 Instalación de Dependencias

```bash
npm install jsonwebtoken bcryptjs dotenv cors helmet express-rate-limit
```

#### 1.1.2 Crear archivo .env

```bash
# .env
JWT_SECRET=tu_clave_super_secreta_128_caracteres_minimo_APECC_2024
JWT_EXPIRE=24h
ENCRYPTION_KEY=tu_clave_encriptacion_256_bits_APECC_2024
NODE_ENV=production
PORT=3443
CORS_ORIGIN=https://apecc.org,https://www.apecc.org
ADMIN_USERNAME=admin_apecc
ADMIN_PASSWORD_HASH=bcrypt_hash_aqui
```

#### 1.1.3 Crear middleware de autenticación

Archivo: `middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Token no proporcionado. Acceso denegado.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Token expirado. Inicia sesión nuevamente.'
            });
        }
        return res.status(403).json({
            status: 'error',
            message: 'Token inválido.'
        });
    }
}

function verifyAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'Solo administradores pueden acceder.'
        });
    }
    next();
}

module.exports = { verifyToken, verifyAdmin };
```

#### 1.1.4 Crear endpoint de login

Archivo: `routes/auth.js`

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Credenciales (idealmente en BD con hash)
const ADMIN_USER = process.env.ADMIN_USERNAME;
const ADMIN_PASS_HASH = process.env.ADMIN_PASSWORD_HASH;

/**
 * POST /auth/login
 * Autentica administrador y retorna JWT
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Validar campos
    if (!username || !password) {
        return res.status(400).json({
            status: 'error',
            message: 'Usuario y contraseña requeridos.'
        });
    }

    // Validar credenciales
    if (username !== ADMIN_USER) {
        return res.status(401).json({
            status: 'error',
            message: 'Credenciales inválidas.'
        });
    }

    // Comparar contraseña con hash
    const passwordMatch = await bcrypt.compare(password, ADMIN_PASS_HASH);
    if (!passwordMatch) {
        return res.status(401).json({
            status: 'error',
            message: 'Credenciales inválidas.'
        });
    }

    // Generar JWT
    const token = jwt.sign(
        { 
            id: 1,
            username: ADMIN_USER,
            role: 'admin',
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
        status: 'success',
        message: 'Autenticación exitosa.',
        token: token,
        expiresIn: '24h'
    });
});

module.exports = router;
```

#### 1.1.5 Generar hash de contraseña

```bash
# En Node.js REPL
node -e "
const bcrypt = require('bcryptjs');
const password = 'TU_CONTRASEÑA_SEGURA_AQUI_32_CARACTERES';
const hash = bcrypt.hashSync(password, 10);
console.log('Hash para .env:');
console.log(hash);
"
```

#### 1.1.6 Actualizar server.js con autenticación

```javascript
// En server.js, después de middlewares iniciales

const { verifyToken, verifyAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

// Rutas públicas
app.use('/auth', authRoutes);

// ========== RUTAS PROTEGIDAS ==========

/**
 * POST /api/matriculas
 * Protegido: requiere token, pero permite registro público
 */
app.post('/api/matriculas', (req, res) => {
    // Validar sin necesidad de token (registro público)
    const { codigo, transaccion, curso, monto, nombre, dni, correo, telefono, metodo, voucher } = req.body;

    if (!nombre || !dni || !curso || !monto || !metodo) {
        return res.status(400).json({
            status: 'error',
            message: 'Faltan campos obligatorios.'
        });
    }

    // Insertar en BD... (código existente con validaciones mejoradas)
    const estadoFinal = 'Pendiente';
    const fechaRegistro = new Date().toLocaleString('es-PE');

    const sql = `
        INSERT INTO matriculas 
        (codigo, transaccion, curso, monto, nombre, dni, correo, telefono, metodo, voucher, estado, fecha)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        codigo || `APECC-${Math.floor(100000 + Math.random() * 900000)}`,
        transaccion || `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`,
        curso, monto, nombre, dni, correo, telefono, metodo, voucher || '', estadoFinal, fechaRegistro
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Error al insertar:', err.message);
            return res.status(500).json({ status: 'error', message: 'Error en la base de datos.' });
        }
        res.status(201).json({
            status: 'success',
            message: 'Matrícula registrada correctamente.',
            id: this.lastID
        });
    });
});

/**
 * GET /api/matriculas
 * PROTEGIDO: Solo admins pueden listar todos los registros
 */
app.get('/api/matriculas', verifyToken, verifyAdmin, (req, res) => {
    const sql = 'SELECT * FROM matriculas ORDER BY id DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error:', err.message);
            return res.status(500).json({ status: 'error', message: 'Error al consultar.' });
        }
        
        // Log de auditoría
        console.log(`[AUDIT] Usuario ${req.user.username} accedió a listado de matrículas (${rows.length} registros)`);
        
        res.json(rows);
    });
});

/**
 * PUT /api/matriculas/:id/estado
 * PROTEGIDO: Solo admins pueden cambiar estados
 */
app.put('/api/matriculas/:id/estado', verifyToken, verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['Pendiente', 'Aprobado', 'Rechazado'];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ status: 'error', message: 'Estado inválido.' });
    }

    const sql = 'UPDATE matriculas SET estado = ? WHERE id = ?';
    db.run(sql, [estado, id], function (err) {
        if (err) {
            console.error('Error:', err.message);
            return res.status(500).json({ status: 'error', message: 'Error al actualizar.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ status: 'error', message: 'Matrícula no encontrada.' });
        }

        // Log de auditoría
        console.log(`[AUDIT] ${req.user.username} cambió matrícula ${id} a estado ${estado}`);

        res.json({ status: 'success', message: `Estado actualizado a ${estado}` });
    });
});

/**
 * DELETE /api/matriculas/:id
 * PROTEGIDO: Solo admins pueden eliminar
 */
app.delete('/api/matriculas/:id', verifyToken, verifyAdmin, (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM matriculas WHERE id = ?';
    db.run(sql, [id], function (err) {
        if (err) {
            console.error('Error:', err.message);
            return res.status(500).json({ status: 'error', message: 'Error al eliminar.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ status: 'error', message: 'Matrícula no encontrada.' });
        }

        // Log de auditoría
        console.log(`[AUDIT] ${req.user.username} ELIMINÓ matrícula ${id}`);

        res.json({ status: 'success', message: 'Matrícula eliminada.' });
    });
});
```

**Checklist Tarea 1.1:**
- [ ] Dependencias instaladas
- [ ] .env configurado con secretos seguros
- [ ] Middleware de auth creado
- [ ] Endpoint /auth/login funcional
- [ ] Endpoints protegidos con verifyToken
- [ ] Admins requieren verifyAdmin
- [ ] Hash de contraseña generado y guardado
- [ ] Testing manual con Postman/Insomnia

---

### Tarea 1.2: Implementar HTTPS/TLS

**Responsable:** DevOps  
**Duración:** 1 día  
**Complejidad:** Baja

#### 1.2.1 Opción A: Let's Encrypt (Recomendado para producción)

```bash
# Instalar Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-standalone

# Generar certificado (reemplaza apecc.org con tu dominio)
sudo certbot certonly --standalone -d apecc.org -d www.apecc.org

# Renovación automática
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar renovación
sudo certbot renew --dry-run
```

#### 1.2.2 Opción B: Auto-firmado (Desarrollo/Testing)

```bash
# Generar certificado auto-firmado válido por 365 días
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=PE/ST=Junin/L=Huancayo/O=APECC/CN=apecc.org"

# Esto crea: key.pem (privada) y cert.pem (pública)
```

#### 1.2.3 Actualizar server.js para HTTPS

```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');

// Leer certificado y clave privada
const options = {
    key: fs.readFileSync(path.join(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};

// Crear servidor HTTPS
const PORT = process.env.PORT || 3443;

https.createServer(options, app).listen(PORT, () => {
    console.log(`🔒 HTTPS Seguro en puerto ${PORT}`);
    console.log(`✅ Servidor APECC activo en https://localhost:${PORT}`);
});

// Opcional: Redirigir HTTP → HTTPS
const http = require('http');
http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
}).listen(3000);
```

#### 1.2.4 Actualizar package.json

```json
{
  "scripts": {
    "start": "node server.js",
    "start:prod": "NODE_ENV=production node server.js"
  }
}
```

**Checklist Tarea 1.2:**
- [ ] Certificado SSL generado o Let's Encrypt configurado
- [ ] server.js actualizado para HTTPS
- [ ] Redireccionamiento HTTP → HTTPS funcionando
- [ ] Certificado válido sin errores de navegador
- [ ] SSL Labs rating: A o superior
- [ ] package.json actualizado
- [ ] Puertos 3000 (HTTP) y 3443 (HTTPS) abiertos

---

### Tarea 1.3: Encriptar Base de Datos

**Responsable:** Backend Developer  
**Duración:** 2 días  
**Complejidad:** Media-Alta

#### 1.3.1 Instalar librería de encriptación

```bash
npm install crypto-js argon2
```

#### 1.3.2 Crear módulo de encriptación

Archivo: `utils/encryption.js`

```javascript
const CryptoJS = require('crypto-js');
const argon2 = require('argon2');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error('ENCRYPTION_KEY debe tener al menos 32 caracteres');
}

/**
 * Encriptar datos sensibles (DNI, correo, etc)
 */
function encryptData(plaintext) {
    if (!plaintext) return null;
    try {
        const encrypted = CryptoJS.AES.encrypt(
            plaintext.toString(),
            ENCRYPTION_KEY
        ).toString();
        return encrypted;
    } catch (error) {
        console.error('Error encriptando:', error);
        throw error;
    }
}

/**
 * Desencriptar datos
 */
function decryptData(ciphertext) {
    if (!ciphertext) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted;
    } catch (error) {
        console.error('Error desencriptando:', error);
        throw error;
    }
}

/**
 * Hash seguro para contraseñas (Argon2 - resistente a GPU attacks)
 */
async function hashPassword(password) {
    try {
        const hash = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16, // 64 MB
            timeCost: 3,
            parallelism: 1
        });
        return hash;
    } catch (error) {
        console.error('Error hasheando contraseña:', error);
        throw error;
    }
}

/**
 * Verificar contraseña contra hash
 */
async function verifyPassword(password, hash) {
    try {
        return await argon2.verify(hash, password);
    } catch (error) {
        console.error('Error verificando contraseña:', error);
        return false;
    }
}

/**
 * Hash para datos no-sensibles (velocidad sobre seguridad)
 */
function hashData(data) {
    return CryptoJS.SHA256(data).toString();
}

module.exports = {
    encryptData,
    decryptData,
    hashPassword,
    verifyPassword,
    hashData
};
```

#### 1.3.3 Actualizar esquema de BD

```sql
-- backup primero
.backup base_datos_backup.db

-- Crear tabla con nuevas columnas encriptadas
ALTER TABLE matriculas ADD COLUMN dni_encrypted TEXT;
ALTER TABLE matriculas ADD COLUMN correo_encrypted TEXT;
ALTER TABLE matriculas ADD COLUMN telefono_encrypted TEXT;
ALTER TABLE matriculas ADD COLUMN nombre_encrypted TEXT;
```

#### 1.3.4 Migración de datos existentes

Archivo: `scripts/migrate-encryption.js`

```javascript
const sqlite3 = require('sqlite3').verbose();
const { encryptData } = require('../utils/encryption');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../base_datos.db'));

async function migrateEncryption() {
    console.log('Iniciando migración de encriptación...');

    return new Promise((resolve, reject) => {
        db.all('SELECT id, dni, correo, telefono, nombre FROM matriculas', async (err, rows) => {
            if (err) {
                console.error('Error leyendo BD:', err);
                reject(err);
                return;
            }

            let processed = 0;
            for (const row of rows) {
                const dniEnc = encryptData(row.dni);
                const correoEnc = encryptData(row.correo);
                const telefonoEnc = encryptData(row.telefono);
                const nombreEnc = encryptData(row.nombre);

                db.run(
                    `UPDATE matriculas 
                     SET dni_encrypted = ?, correo_encrypted = ?, telefono_encrypted = ?, nombre_encrypted = ?
                     WHERE id = ?`,
                    [dniEnc, correoEnc, telefonoEnc, nombreEnc, row.id],
                    (err) => {
                        if (err) console.error('Error actualizando fila', row.id, ':', err);
                        processed++;
                        if (processed === rows.length) {
                            console.log(`✅ ${processed} registros encriptados`);
                            db.close();
                            resolve();
                        }
                    }
                );
            }
        });
    });
}

migrateEncryption().catch(console.error);
```

Ejecutar migración:
```bash
node scripts/migrate-encryption.js
```

#### 1.3.5 Actualizar endpoints para usar datos encriptados

```javascript
const { encryptData, decryptData } = require('../utils/encryption');

app.post('/api/matriculas', (req, res) => {
    const { codigo, transaccion, curso, monto, nombre, dni, correo, telefono, metodo, voucher } = req.body;

    // Encriptar datos sensibles
    const nombreEnc = encryptData(nombre);
    const dniEnc = encryptData(dni);
    const correoEnc = encryptData(correo);
    const telefonoEnc = encryptData(telefono);

    const sql = `
        INSERT INTO matriculas 
        (codigo, transaccion, curso, monto, nombre_encrypted, dni_encrypted, 
         correo_encrypted, telefono_encrypted, metodo, voucher, estado, fecha)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        codigo || `APECC-${Math.random().toString(36).substr(2, 9)}`,
        transaccion || `TXN-${Math.random().toString(36).substr(2, 9)}`,
        curso, monto, nombreEnc, dniEnc, correoEnc, telefonoEnc, 
        metodo, voucher || '', 'Pendiente', new Date().toLocaleString('es-PE')
    ];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ status: 'error', message: 'Error en BD' });
        }
        res.status(201).json({
            status: 'success',
            message: 'Matrícula registrada (datos encriptados)',
            id: this.lastID
        });
    });
});

app.get('/api/matriculas', verifyToken, verifyAdmin, (req, res) => {
    const sql = 'SELECT * FROM matriculas ORDER BY id DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: 'Error al consultar' });
        }

        // Desencriptar datos sensibles antes de retornar
        const decryptedRows = rows.map(row => ({
            ...row,
            nombre: row.nombre_encrypted ? decryptData(row.nombre_encrypted) : '',
            dni: row.dni_encrypted ? decryptData(row.dni_encrypted) : '',
            correo: row.correo_encrypted ? decryptData(row.correo_encrypted) : '',
            telefono: row.telefono_encrypted ? decryptData(row.telefono_encrypted) : ''
        }));

        res.json(decryptedRows);
    });
});
```

**Checklist Tarea 1.3:**
- [ ] Librerías instaladas (crypto-js, argon2)
- [ ] Módulo de encriptación creado
- [ ] Tabla de BD migrada con columnas encriptadas
- [ ] Script de migración ejecutado exitosamente
- [ ] Endpoints actualizados para encriptar/desencriptar
- [ ] Testing: verificar que datos se guardan encriptados
- [ ] Testing: verificar que admin puede desencriptar
- [ ] Backup pre-migración disponible

---

### Tarea 1.4: Restringir CORS

**Responsable:** Backend Developer  
**Duración:** 1 día  
**Complejidad:** Baja

#### 1.4.1 Configurar CORS seguro

Archivo: `config/cors.js`

```javascript
const cors = require('cors');

const allowedOrigins = [
    'https://apecc.org',
    'https://www.apecc.org',
    'https://admin.apecc.org',
    'https://app.apecc.org'
];

// En desarrollo local
if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:3443');
}

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS no permitido para: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400 // 24 horas
};

module.exports = cors(corsOptions);
```

#### 1.4.2 Actualizar server.js

```javascript
const corsConfig = require('./config/cors');

// Aplicar CORS restringido
app.use(corsConfig);

// Headers de seguridad adicionales
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});
```

**Checklist Tarea 1.4:**
- [ ] Archivo config/cors.js creado
- [ ] Solo dominios autorizados en allowedOrigins
- [ ] CORS aplicado en server.js
- [ ] Headers de seguridad configurados
- [ ] Testing: CORS funciona desde dominios autorizados
- [ ] Testing: CORS rechaza dominios no autorizados
- [ ] Testing: Preflight OPTIONS requests funcionan

---

### Tarea 1.5: Validación Robusta de Input

**Responsable:** Backend Developer  
**Duración:** 1 día  
**Complejidad:** Baja

#### 1.5.1 Instalar express-validator

```bash
npm install express-validator
```

#### 1.5.2 Crear validadores personalizados

Archivo: `middleware/validators.js`

```javascript
const { body, validationResult, param } = require('express-validator');

/**
 * Middleware para manejar errores de validación
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            message: 'Validación fallida',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

/**
 * Reglas de validación para matrícula
 */
const validateMatricula = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('Nombre es requerido')
        .isLength({ min: 3, max: 100 }).withMessage('Nombre debe tener 3-100 caracteres')
        .matches(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/).withMessage('Nombre solo puede contener letras'),
    
    body('dni')
        .trim()
        .notEmpty().withMessage('DNI es requerido')
        .isLength({ min: 8, max: 8 }).withMessage('DNI debe tener exactamente 8 dígitos')
        .isNumeric().withMessage('DNI solo puede contener números'),
    
    body('correo')
        .trim()
        .notEmpty().withMessage('Correo es requerido')
        .isEmail().withMessage('Correo debe ser válido')
        .normalizeEmail(),
    
    body('telefono')
        .trim()
        .notEmpty().withMessage('Teléfono es requerido')
        .matches(/^\+?[0-9]{7,15}$/).withMessage('Teléfono debe ser válido'),
    
    body('curso')
        .trim()
        .notEmpty().withMessage('Curso es requerido')
        .isLength({ min: 3 }).withMessage('Curso debe tener mínimo 3 caracteres'),
    
    body('monto')
        .trim()
        .notEmpty().withMessage('Monto es requerido')
        .isFloat({ min: 10, max: 10000 }).withMessage('Monto debe estar entre 10 y 10000 soles'),
    
    body('metodo')
        .trim()
        .notEmpty().withMessage('Método de pago es requerido')
        .isIn(['Yape', 'Plin', 'BCP']).withMessage('Método de pago no válido'),
    
    body('voucher')
        .optional()
        .isLength({ max: 5000000 }).withMessage('Voucher muy grande (máx 5MB)')
];

/**
 * Validación para cambio de estado
 */
const validateEstado = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID debe ser número válido'),
    
    body('estado')
        .trim()
        .notEmpty().withMessage('Estado es requerido')
        .isIn(['Pendiente', 'Aprobado', 'Rechazado']).withMessage('Estado no válido')
];

module.exports = {
    validateMatricula,
    validateEstado,
    handleValidationErrors
};
```

#### 1.5.3 Aplicar validadores en endpoints

```javascript
const { validateMatricula, validateEstado, handleValidationErrors } = 
    require('./middleware/validators');

app.post('/api/matriculas', validateMatricula, handleValidationErrors, (req, res) => {
    // Datos ya validados
    // ... código de inserción
});

app.put('/api/matriculas/:id/estado', validateEstado, handleValidationErrors, 
    verifyToken, verifyAdmin, (req, res) => {
    // Datos ya validados
    // ... código de actualización
});
```

**Checklist Tarea 1.5:**
- [ ] express-validator instalado
- [ ] middleware/validators.js creado con reglas
- [ ] Validadores aplicados en todos los endpoints
- [ ] Testing: input válido acepta
- [ ] Testing: input inválido rechaza con mensaje claro
- [ ] Testing: SQL injection intentos son bloqueados
- [ ] Testing: XSS intentos son prevenidos

---

### Fase 1 - Integración Final

#### Verificación de seguridad Pre-Deploy

```bash
# 1. Auditar dependencias
npm audit

# 2. Escanear con OWASP ZAP
docker run -v $(pwd):/workspace owasp/zap2docker-stable \
  zap-baseline.py -t https://localhost:3443 -r /workspace/zap-report.html

# 3. Analizar código con SonarQube
sonar-scanner \
  -Dsonar.projectKey=apecc-seg \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000

# 4. Verificar SSL
openssl s_client -connect localhost:3443
```

---

## 🔒 FASE 2: SEGURIDAD AVANZADA {#fase-2-seguridad-avanzada}

**Timeline:** 14-21 días  
**Equipo:** 2 Developers + 1 DevOps  
**Objetivo:** Prevenir ataques y auditar acciones

### Tarea 2.1: Rate Limiting

**Responsable:** Backend Developer  
**Duración:** 1 día

```bash
npm install express-rate-limit redis
```

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 intentos
    message: 'Demasiados intentos de login. Intenta en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 req/min
    message: 'Demasiadas solicitudes. Intenta después.'
});

app.post('/auth/login', loginLimiter, (req, res) => {
    // Código de login
});

app.use('/api/', apiLimiter);
```

**Checklist:**
- [ ] Rate limiting implementado en /auth/login
- [ ] Rate limiting en /api endpoints
- [ ] Testing: 5+ intentos rechazados
- [ ] Testing: Límites se resetean correctamente

---

### Tarea 2.2: CSRF Protection

**Responsable:** Backend Developer  
**Duración:** 1 día

```bash
npm install csurf cookie-parser
```

```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(csrf({ cookie: false }));

// Endpoint para obtener CSRF token
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Aplicar CSRF a cambios de estado
app.put('/api/matriculas/:id/estado', csrf(), verifyToken, verifyAdmin, (req, res) => {
    // CSRF ya validado por middleware
    // ... código
});
```

---

### Tarea 2.3: Logging Centralizado

**Responsable:** DevOps  
**Duración:** 2 días

```bash
npm install winston winston-elasticsearch express-winston
docker run -d --name elasticsearch -e "discovery.type=single-node" \
  -p 9200:9200 docker.elastic.co/elasticsearch/elasticsearch:8.0.0
docker run -d --name kibana -p 5601:5601 \
  docker.elastic.co/kibana/kibana:8.0.0
```

```javascript
const winston = require('winston');
const ElasticsearchTransport = require('winston-elasticsearch');

const logger = winston.createLogger({
    defaultMeta: { service: 'apecc-api' },
    transports: [
        new ElasticsearchTransport({
            level: 'info',
            clientOpts: { node: 'http://localhost:9200' },
            index: 'apecc-logs'
        }),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Middleware para loguear requests
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: duration,
            userId: req.user?.id,
            ip: req.ip
        });
    });
    next();
});

// Loguear cambios sensibles
logger.info('Estado de matrícula actualizado', {
    matriculaId: id,
    nuevoEstado: estado,
    usuarioId: req.user.id,
    timestamp: new Date()
});
```

---

### Tarea 2.4: Backups Encriptados

**Responsable:** DevOps  
**Duración:** 1 día

Archivo: `scripts/backup.sh`

```bash
#!/bin/bash

BACKUP_DIR="/backups/apecc"
DATE=$(date +%Y%m%d_%H%M%S)
ENCRYPTION_KEY="${ENCRYPTION_KEY}"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Hacer backup de BD
sqlite3 /app/base_datos.db ".dump" | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Encriptar con GPG
gpg --symmetric --cipher-algo AES256 \
    --output $BACKUP_DIR/backup_$DATE.sql.gz.gpg \
    $BACKUP_DIR/backup_$DATE.sql.gz

# Eliminar archivo sin encriptar
rm $BACKUP_DIR/backup_$DATE.sql.gz

# Subir a AWS S3
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz.gpg \
    s3://apecc-backups-seguros/

# Limpiar backups locales mayores a 30 días
find $BACKUP_DIR -name "backup_*.gpg" -mtime +30 -delete

echo "✅ Backup completado: $DATE"
```

Configurar cron job:
```bash
# Diariamente a las 2 AM
0 2 * * * /app/scripts/backup.sh >> /var/log/apecc-backup.log 2>&1
```

---

## 🏆 FASE 3: HARDENING Y COMPLIANCE {#fase-3-hardening-y-compliance}

**Timeline:** 21-42 días  
**Equipo:** 2 Developers + 1 DevOps + Auditor Externo  
**Objetivo:** Máxima seguridad y cumplimiento normativo

### Tarea 3.1: 2FA para Administradores

```bash
npm install speakeasy qrcode
```

```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Generar secret para 2FA
app.post('/auth/2fa/setup', verifyToken, async (req, res) => {
    const secret = speakeasy.generateSecret({
        name: `APECC (${req.user.username})`,
        issuer: 'APECC',
        length: 32
    });

    // Generar QR
    const qr = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
        secret: secret.base32,
        qrCode: qr
    });
});

// Verificar 2FA en login
app.post('/auth/login/2fa', async (req, res) => {
    const { username, password, token } = req.body;

    // Validar credenciales...
    
    // Validar token 2FA
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
    });

    if (!verified) {
        return res.status(401).json({ status: 'error', message: 'Token 2FA inválido' });
    }

    // Generar JWT
    const jwt_token = jwt.sign({ id: user.id, role: 'admin' }, process.env.JWT_SECRET);
    res.json({ token: jwt_token });
});
```

---

### Tarea 3.2: WAF con ModSecurity

```bash
# Instalar ModSecurity en Nginx
sudo apt-get install nginx libnginx-mod-http-modsecurity

# Descargar reglas OWASP
git clone https://github.com/coreruleset/coreruleset.git /etc/nginx/modsec-rules
```

Configuración Nginx (`/etc/nginx/nginx.conf`):
```nginx
http {
    modsecurity on;
    modsecurity_rules_file /etc/nginx/modsec-rules/crs-setup.conf;
    modsecurity_rules_file /etc/nginx/modsec-rules/rules/*.conf;

    upstream apecc_api {
        server localhost:3443;
    }

    server {
        listen 443 ssl http2;
        server_name apecc.org www.apecc.org;

        ssl_certificate /etc/letsencrypt/live/apecc.org/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/apecc.org/privkey.pem;

        location / {
            proxy_pass https://apecc_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

### Tarea 3.3: Migración a PostgreSQL

```bash
npm install pg pg-promise
```

Crear script de migración de SQLite → PostgreSQL

```javascript
const sqlite3 = require('sqlite3');
const { Pool } = require('pg');
const path = require('path');

const sqliteDb = new sqlite3.Database(path.join(__dirname, '../base_datos.db'));
const pgPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function migrateToPostgreSQL() {
    console.log('Iniciando migración SQLite → PostgreSQL...');

    // Crear tabla en PostgreSQL
    await pgPool.query(`
        CREATE TABLE IF NOT EXISTS matriculas (
            id SERIAL PRIMARY KEY,
            codigo VARCHAR(50) NOT NULL UNIQUE,
            transaccion VARCHAR(50) NOT NULL UNIQUE,
            curso VARCHAR(200) NOT NULL,
            monto DECIMAL(10, 2) NOT NULL,
            nombre_encrypted TEXT NOT NULL,
            dni_encrypted TEXT NOT NULL,
            correo_encrypted TEXT NOT NULL,
            telefono_encrypted TEXT NOT NULL,
            metodo VARCHAR(50) NOT NULL,
            voucher BYTEA,
            estado VARCHAR(50) DEFAULT 'Pendiente',
            fecha TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migrar datos
    return new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM matriculas', async (err, rows) => {
            if (err) reject(err);

            for (const row of rows) {
                await pgPool.query(
                    `INSERT INTO matriculas VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                    [
                        row.id, row.codigo, row.transaccion, row.curso, row.monto,
                        row.nombre_encrypted, row.dni_encrypted, row.correo_encrypted,
                        row.telefono_encrypted, row.metodo, row.voucher, row.estado, row.fecha
                    ]
                );
            }

            console.log('✅ Migración completada');
            resolve();
        });
    });
}

migrateToPostgreSQL().catch(console.error);
```

---

## 🧪 TESTING Y VALIDACIÓN {#testing-y-validación}

### Testing de Seguridad Fase 1-3

#### 1. OWASP ZAP - Escaneo Automático

```bash
docker run -v $(pwd):/workspace owasp/zap2docker-stable \
  zap-baseline.py -t https://apecc.org \
  -r /workspace/zap-report.html \
  -J /workspace/zap-report.json
```

Criterios de éxito:
- [ ] 0 vulnerabilidades CRÍTICAS
- [ ] ≤2 vulnerabilidades ALTAS
- [ ] ≤5 vulnerabilidades MEDIAS

#### 2. Burp Suite Manual Testing

```bash
# Login a admin
POST /auth/login
{
  "username": "admin_apecc",
  "password": "tu_contraseña"
}

Response: { "token": "eyJ0eXAi..." }

# Usar token en requests
GET /api/matriculas
Authorization: Bearer eyJ0eXAi...
```

Casos de prueba:
- [ ] Login fallido 5+ veces → bloqueado 15 min
- [ ] Token expirado → 401
- [ ] Token inválido → 403
- [ ] Cambio de estado sin admin → 403
- [ ] Datos encriptados en BD (verificar directamente)
- [ ] CORS rechaza dominios no autorizados
- [ ] SQL injection bloqueado
- [ ] XSS en inputs bloqueado

#### 3. npm audit

```bash
npm audit

# Debe mostrar:
# 0 critical, 0 high
```

#### 4. SonarQube Analysis

```bash
sonar-scanner \
  -Dsonar.projectKey=apecc-seguridad \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000
```

Criterios:
- [ ] Calidad ≥ B
- [ ] 0 vulnerabilidades
- [ ] 0 security hotspots críticos

---

## 🚀 ROLLOUT A PRODUCCIÓN {#rollout-a-producción}

### Pre-deployment Checklist

```markdown
## Seguridad
- [ ] JWT autenticación implementada
- [ ] HTTPS/TLS con certificado válido
- [ ] Datos encriptados en BD
- [ ] CORS restringido
- [ ] Validación robusta en todos los inputs
- [ ] Rate limiting activo
- [ ] CSRF protection habilitado
- [ ] Logging centralizado funcionando
- [ ] Backups encriptados y probados
- [ ] 2FA para admins (Fase 3)

## Testing
- [ ] OWASP ZAP: 0 críticas
- [ ] Burp Suite: todos los casos pasados
- [ ] npm audit: 0 vulnerabilidades altas
- [ ] SonarQube: Calidad ≥ B
- [ ] Tests unitarios: 90%+ cobertura
- [ ] Tests de integración: todos pasados
- [ ] Recuperación ante desastres: probada

## Operacional
- [ ] Documentación de arquitectura seguridad
- [ ] Runbooks para incidentes
- [ ] Guías de operación para DevOps
- [ ] Capacitación del equipo completada
- [ ] Monitoreo y alertas configuradas
- [ ] Plan de respuesta a incidentes
- [ ] SLA de seguridad definido

## Compliance
- [ ] Auditoría externa completada (si aplica)
- [ ] LGPD/GDPR compliance verificado
- [ ] PCI DSS requerimientos cumplidos
- [ ] Política de privacidad publicada
- [ ] Consentimiento de datos implementado
```

### Deployment Strategy

**Opción 1: Blue-Green Deployment (Recomendado)**
```bash
# 1. Desplegar nueva versión en servidor "verde"
# 2. Ejecutar full smoke tests
# 3. Cambiar load balancer → verde
# 4. Mantener "azul" como rollback
```

**Opción 2: Canary Deployment**
```bash
# 1. Deploy a 10% del tráfico
# 2. Monitorear métricas por 1 hora
# 3. Si OK, escallar a 50%
# 4. Si OK, rollout 100%
```

---

## 📊 MANTENIMIENTO CONTINUO {#mantenimiento-continuo}

### Semana 1-4 Post-Deployment

**Tareas diarias:**
- [ ] Revisar logs de seguridad (Kibana)
- [ ] Monitorear alertas (Prometheus)
- [ ] Verificar health checks

**Tareas semanales:**
- [ ] Backup integrity check
- [ ] Dependency updates (npm audit)
- [ ] Rotación de secrets
- [ ] Reunión de seguridad del equipo

**Tareas mensuales:**
- [ ] Penetration testing light
- [ ] Security training
- [ ] Incident review (si aplica)
- [ ] Actualizar playbooks

### Plan de Actualización Continua

```
Cada semana:
├─ npm audit → corregir vulnerabilidades
├─ Security patches → aplicar dentro de 24h si crítico
└─ Code scanning → SonarQube

Cada mes:
├─ Dependency updates
├─ Certificado SSL check
└─ Backup recovery test

Cada trimestre:
├─ Penetration testing light
├─ Seguridad review
├─ Capacitación del equipo
└─ Actualización de políticas

Cada año:
├─ Auditoría externa completa
├─ Certificación SOC 2
└─ Disaster recovery drill
```

---

## 📋 MATRIZ DE RESPONSABILIDADES

| Tarea | Owner | Stakeholders | Duración | Deadline |
|-------|-------|--------------|----------|----------|
| JWT + Autenticación | Developer 1 | Lead Técnico | 2d | Día 2 |
| HTTPS/TLS | DevOps | Lead Técnico | 1d | Día 3 |
| Encriptación BD | Developer 1 | DevOps | 2d | Día 5 |
| CORS + Validación | Developer 2 | Lead Técnico | 2d | Día 5 |
| Rate Limiting | Developer 2 | Lead Técnico | 1d | Día 6 |
| Logging | DevOps | Developer 1 | 2d | Día 8 |
| Backups | DevOps | Lead Técnico | 1d | Día 9 |
| Testing Fase 1 | QA | Lead Técnico | 2d | Día 10 |
| 2FA | Developer 1 | Lead Técnico | 2d | Semana 3 |
| WAF | DevOps | Lead Técnico | 2d | Semana 3 |
| PostgreSQL | Developer 1 | DevOps | 3d | Semana 4 |
| Auditoría Externa | Auditor | Lead Técnico | 5d | Semana 5 |

---

## 💰 PRESUPUESTO ESTIMADO

### Opción A: DIY (Hazlo tú mismo)

```
Recursos internos:
├─ Developer 1: 80h × $50/h = $4,000
├─ Developer 2: 60h × $50/h = $3,000
├─ DevOps: 40h × $60/h = $2,400
├─ QA: 20h × $45/h = $900
└─ Lead Técnico: 40h × $70/h = $2,800

Infraestructura:
├─ Servidor AWS m5.large: $100/mes × 3 = $300
├─ Let's Encrypt: Gratuito
├─ ELK Stack: Gratuito (self-hosted)
└─ Herramientas: Gratuitas (ZAP, SonarQube, Snyk free)

TOTAL: $14,400 USD (aproximado)
Duración: 8-10 semanas
```

### Opción B: Auditoría Externa Incluida

```
Lo anterior +
├─ Auditoría externa (40h): $8,000
├─ Consultoría: $3,000
└─ Certificación: $2,000

TOTAL: $27,400 USD
Duración: 12 semanas
```

### Opción C: Cloud Security + SaaS

```
Lo anterior +
├─ Datadog: $150/mes × 12 = $1,800
├─ Snyk Pro: $50/mes × 12 = $600
├─ AWS Security Hub: $0.10/check × 100 = $10/mes = $120
└─ CloudFlare Pro: $20/mes × 12 = $240

TOTAL (adicional): $2,760 USD/año
```

---

## ✅ MÉTRICAS DE ÉXITO

### Fase 1 (Crítica)
```
✓ 0 vulnerabilidades críticas expuestas
✓ 100% endpoints con autenticación
✓ 100% datos sensibles encriptados
✓ HTTPS/TLS válido (A+ SSL Labs)
✓ CORS restringido
```

### Fase 2 (Avanzada)
```
✓ Rate limiting activo
✓ Logging completo funcionando
✓ Backups probados y restaurables
✓ CSRF protection en lugar
✓ 0 violaciones detectadas en testing
```

### Fase 3 (Hardening)
```
✓ 2FA implementado para admins
✓ WAF bloqueando ataques comunes
✓ PostgreSQL en producción
✓ Auditoría externa aprobada
✓ SOC 2 Type II en progreso
```

---

## 📞 ESCALACIÓN Y SOPORTE

### Equipo de Contacto

| Rol | Nombre | Teléfono | Email | Disponibilidad |
|-----|--------|----------|-------|----------------|
| Security Lead | [Nombre] | [Tel] | [Email] | 24/7 |
| CTO | [Nombre] | [Tel] | [Email] | Horario Laboral |
| DevOps Lead | [Nombre] | [Tel] | [Email] | 24/7 |
| External Auditor | [Empresa] | [Tel] | [Email] | Contratado |

### Canales de Comunicación

- Slack: #apecc-security-incident
- Email: security-team@apecc.org
- Teléfono emergencias: [número]
- Escalación crítica: CTO directo

---

## 📚 REFERENCIAS Y RECURSOS

### Documentación
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- PCI DSS: https://www.pcisecuritystandards.org/
- CIS Controls: https://www.cisecurity.org/controls/

### Herramientas
- OWASP ZAP: https://www.zaproxy.org/
- Burp Suite: https://portswigger.net/burp/community
- SonarQube: https://www.sonarqube.org/
- Snyk: https://snyk.io/

### Capacitación
- PortSwigger Web Security Academy: https://portswigger.net/web-security
- HackTheBox: https://www.hackthebox.com/
- TryHackMe: https://tryhackme.com/

---

## 📝 APROBACIONES Y SIGN-OFF

| Rol | Nombre | Firma | Fecha | Aprobación |
|-----|--------|-------|-------|-----------|
| Security Lead | | | | [ ] |
| CTO | | | | [ ] |
| DevOps Lead | | | | [ ] |
| Compliance Officer | | | | [ ] |

---

**Documento preparado por:** Security Audit Team  
**Fecha de creación:** Septiembre 2026  
**Última actualización:** Septiembre 2026  
**Próxima revisión:** Octubre 2026  
**Clasificación:** Interno - Equipo Técnico

---

## 📞 PREGUNTAS Y SOPORTE

Para preguntas sobre este plan:
1. Contactar al Security Lead
2. Revisar documentación en Wiki interno
3. Escalar al CTO si es necesario
