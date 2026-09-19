/**
 * ==============================================================================
 * PROYECTO INTEGRADOR APECC - SERVIDOR BACKEND SEGURO
 * Módulo de Matrícula en Línea, Gestión de Pagos, Chatbot Seguro y Hardening
 * Conforme al Plan de Remediación de Auditoría de Ciberseguridad APECC
 * ==============================================================================
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

// 1. Cargar Variables de Entorno de forma prioritaria
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Módulos de seguridad propios
const corsConfig = require('./config/cors');
const logger = require('./utils/logger');
const { encryptData, decryptData } = require('./utils/encryption');
const { verifyToken, verifyAdmin } = require('./middleware/auth');
const { validateMatricula, validateEstado, handleValidationErrors } = require('./middleware/validators');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const PORT_HTTPS = process.env.PORT_HTTPS || 3443;

// ------------------------------------------------------------------------------
// 2. CONFIGURACIÓN DE MIDDLEWARES DE SEGURIDAD Y ARCHIVOS ESTÁTICOS
// ------------------------------------------------------------------------------

// Cabeceras de seguridad HTTP con Helmet (X-Content-Type-Options, Frameguard, HSTS, etc.)
app.use(helmet({
    contentSecurityPolicy: false, // Permite estilos e imágenes embebidas en base64 de comprobantes
    crossOriginEmbedderPolicy: false
}));

// Política de orígenes cruzados (CORS) restringida a orígenes institucionales
app.use(corsConfig);

// Cabeceras defensivas complementarias
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Parseo de comprobantes / vouchers con límite seguro de 25MB
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Rate Limiter general para mitigar ataques de denegación de servicio (DoS / Fuerza bruta)
const generalApiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 120, // Máximo 120 peticiones por minuto por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Límite de peticiones alcanzado. Por favor intente más tarde.'
    }
});
app.use('/api/', generalApiLimiter);

// Middleware de Logging estructurado de peticiones HTTP
app.use((req, res, next) => {
    const inicio = Date.now();
    res.on('finish', () => {
        const duracion = Date.now() - inicio;
        // Solo registrar peticiones a la API para evitar saturar el log con estáticos
        if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/auth')) {
            logger.info(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duracion}ms - IP: ${req.ip}`);
        }
    });
    next();
});

// Servir archivos del frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// ------------------------------------------------------------------------------
// 3. BASE DE DATOS SQLITE CON ESQUEMA CIFRADO
// ------------------------------------------------------------------------------
const dbPath = path.join(__dirname, 'base_datos.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error('❌ Error crítico al conectar con SQLite:', err.message);
    } else {
        logger.info('✅ Conectado con éxito a la Base de Datos SQLite en: ' + dbPath);
    }
});

// Inicializar tabla con soporte de campos cifrados en reposo (AES-256)
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS matriculas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT NOT NULL,
            transaccion TEXT NOT NULL,
            curso TEXT NOT NULL,
            monto TEXT NOT NULL,
            nombre TEXT,
            dni TEXT,
            correo TEXT,
            telefono TEXT,
            metodo TEXT NOT NULL,
            voucher TEXT,
            estado TEXT DEFAULT 'Pendiente',
            fecha TEXT NOT NULL,
            nombre_encrypted TEXT,
            dni_encrypted TEXT,
            correo_encrypted TEXT,
            telefono_encrypted TEXT
        )
    `, (err) => {
        if (err) {
            logger.error('❌ Error al inicializar la tabla matriculas:', err.message);
        } else {
            logger.info('📋 Tabla "matriculas" verificada con soporte de cifrado AES-256.');
        }
    });

    // Añadir columnas de cifrado si la tabla ya existía previamente sin ellas
    const cols = ['nombre_encrypted', 'dni_encrypted', 'correo_encrypted', 'telefono_encrypted'];
    cols.forEach(col => {
        db.run(`ALTER TABLE matriculas ADD COLUMN ${col} TEXT`, () => {
            // Ignorar error si la columna ya existe
        });
    });
});

// ------------------------------------------------------------------------------
// 4. RUTAS DE AUTENTICACIÓN
// ------------------------------------------------------------------------------
app.use('/auth', authRoutes);

// ------------------------------------------------------------------------------
// 5. API REST - ENDPOINTS DE MATRÍCULAS (SEGUROS Y PROTEGIDOS)
// ------------------------------------------------------------------------------

/**
 * POST /api/matriculas
 * Registra una nueva matrícula pública cifrando todos los datos sensibles del alumno
 */
app.post('/api/matriculas', validateMatricula, handleValidationErrors, (req, res) => {
    const { codigo, transaccion, curso, monto, nombre, dni, correo, telefono, metodo, voucher, estado, fecha } = req.body;

    // 🛡️ Cifrado AES-256 de Datos Personales Identificables (PII)
    const nombreEnc = encryptData(nombre);
    const dniEnc = encryptData(dni);
    const correoEnc = encryptData(correo);
    const telefonoEnc = encryptData(telefono);

    // Enmascaramiento de los campos antiguos para que NUNCA queden en texto plano en la BD
    const dniMasked = dni ? `${dni.slice(0, 2)}****${dni.slice(-2)}` : '****';
    const nombreMasked = nombre ? `${nombre.slice(0, 3)}***` : '***';

    const estadoFinal = estado || 'Pendiente';
    const fechaRegistro = fecha || new Date().toLocaleString('es-PE');
    const codigoFinal = codigo || `APECC-${Math.floor(100000 + Math.random() * 900000)}`;
    const transaccionFinal = transaccion || `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`;

    const sql = `
        INSERT INTO matriculas 
        (codigo, transaccion, curso, monto, nombre, dni, correo, telefono, metodo, voucher, estado, fecha,
         nombre_encrypted, dni_encrypted, correo_encrypted, telefono_encrypted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        codigoFinal,
        transaccionFinal,
        curso,
        monto,
        nombreMasked,
        dniMasked,
        correoEnc,     // Cifrado también en campo regular para máxima confidencialidad
        telefonoEnc,   // Cifrado también en campo regular
        metodo,
        voucher || '',
        estadoFinal,
        fechaRegistro,
        nombreEnc,
        dniEnc,
        correoEnc,
        telefonoEnc
    ];

    db.run(sql, params, function (err) {
        if (err) {
            logger.error('❌ Error al insertar matrícula cifrada:', err.message);
            return res.status(500).json({ status: 'error', message: 'Error interno en la base de datos.' });
        }

        logger.info(`📌 Nueva matrícula registrada y cifrada con ID: ${this.lastID} [${codigoFinal}]`);

        res.status(201).json({
            status: 'success',
            message: 'Matrícula registrada y protegida correctamente.',
            id: this.lastID,
            codigo: codigoFinal,
            transaccion: transaccionFinal
        });
    });
});

/**
 * GET /api/matriculas
 * PROTEGIDO: Solo administradores autenticados mediante JWT pueden consultar y descifrar los registros
 */
app.get('/api/matriculas', verifyToken, verifyAdmin, (req, res) => {
    const sql = 'SELECT * FROM matriculas ORDER BY id DESC';

    db.all(sql, [], (err, rows) => {
        if (err) {
            logger.error('❌ Error al consultar matrículas:', err.message);
            return res.status(500).json({ status: 'error', message: 'Error al consultar la base de datos.' });
        }

        // Descifrado seguro de datos sensibles en memoria únicamente para el administrador
        const decryptedRows = rows.map(row => ({
            ...row,
            nombre: row.nombre_encrypted ? decryptData(row.nombre_encrypted) : (row.nombre || ''),
            dni: row.dni_encrypted ? decryptData(row.dni_encrypted) : (row.dni || ''),
            correo: row.correo_encrypted ? decryptData(row.correo_encrypted) : (row.correo ? decryptData(row.correo) : ''),
            telefono: row.telefono_encrypted ? decryptData(row.telefono_encrypted) : (row.telefono ? decryptData(row.telefono) : '')
        }));

        logger.audit('LISTAR_MATRICULAS', {
            admin: req.user.username,
            totalRegistros: decryptedRows.length,
            ip: req.ip
        });

        res.json(decryptedRows);
    });
});

/**
 * PUT /api/matriculas/:id/estado
 * PROTEGIDO: Solo administradores autenticados pueden modificar estados de matrícula
 */
app.put('/api/matriculas/:id/estado', verifyToken, verifyAdmin, validateEstado, handleValidationErrors, (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const sql = 'UPDATE matriculas SET estado = ? WHERE id = ?';
    db.run(sql, [estado, id], function (err) {
        if (err) {
            logger.error('❌ Error al actualizar estado:', err.message);
            return res.status(500).json({ status: 'error', message: 'Error al actualizar registro.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ status: 'error', message: 'Matrícula no encontrada.' });
        }

        logger.audit('CAMBIO_ESTADO', {
            admin: req.user.username,
            matriculaId: id,
            nuevoEstado: estado,
            ip: req.ip
        });

        res.json({ status: 'success', message: `Estado actualizado a ${estado}` });
    });
});

/**
 * DELETE /api/matriculas/:id
 * PROTEGIDO: Solo administradores autenticados pueden eliminar registros
 */
app.delete('/api/matriculas/:id', verifyToken, verifyAdmin, (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM matriculas WHERE id = ?';
    db.run(sql, [id], function (err) {
        if (err) {
            logger.error('❌ Error al eliminar matrícula:', err.message);
            return res.status(500).json({ status: 'error', message: 'Error al eliminar registro.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ status: 'error', message: 'Matrícula no encontrada.' });
        }

        logger.audit('ELIMINAR_MATRICULA', {
            admin: req.user.username,
            matriculaId: id,
            ip: req.ip
        });

        res.json({ status: 'success', message: 'Matrícula eliminada correctamente.' });
    });
});

// ------------------------------------------------------------------------------
// 6. MÓDULO DE CHATBOT CON SYSTEM PROMPT ESTRICTO DE CIBERSEGURIDAD
// ------------------------------------------------------------------------------

/**
 * Capa Heurística de Detección Temprana (WAF a nivel de aplicación)
 */
function detectarInyeccion(mensaje) {
    if (!mensaje || typeof mensaje !== 'string') return false;

    const patronesPeligrosos = [
        /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
        /ignora\s+(todas\s+las\s+)?instrucciones(\s+anteriores|\s+previas)?/i,
        /olvida\s+(tus|todas\s+las)\s+instrucciones/i,
        /system\s+prompt/i,
        /reveal\s+(your\s+)?(system\s+prompt|prompt|instructions)/i,
        /muestra\s+(tu\s+)?(system\s+prompt|prompt\s+de\s+sistema|instrucciones)/i,
        /you\s+are\s+now\s+in\s+developer\s+mode/i,
        /modo\s+desarrollador/i,
        /dan\s+mode|jailbreak/i,
        /act[uú]a\s+como\s+(un\s+)?hacker/i,
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
        /drop\s+table|union\s+select|insert\s+into|delete\s+from/i,
        /base\s+de\s+datos|database/i,
        /(dame|muestra|revela|lista|ver)\s+(de\s+)?(alumnos|matriculados|usuarios|estudiantes)/i,
        /(dame|muestra|revela)\s+(las\s+)?(contraseñas|claves|passwords|credenciales)/i,
        /eval\s*\(|exec\s*\(/i,
        /curl\s+|wget\s+|chmod\s+|bash\s+|powershell/i
    ];

    return patronesPeligrosos.some((regex) => regex.test(mensaje));
}

function responderConsultaAcademica(mensaje) {
    const texto = mensaje.toLowerCase();

    if (texto.includes('pago') || texto.includes('yape') || texto.includes('plin') || texto.includes('bcp') || texto.includes('cuenta') || texto.includes('transferencia')) {
        return `💳 **Métodos de Pago Oficiales de APECC:**\n\n` +
               `1. **Yape / Plin:** Escanea el código QR que se muestra en la pasarela al seleccionar el curso.\n` +
               `2. **BCP Transferencia Directa:**\n` +
               `   - Cta. Corriente BCP: \`191-98765432-0-89\`\n` +
               `   - CCI: \`002-191009876543208954\`\n` +
               `   - Titular: *APECC Oficial*\n\n` +
               `📌 **Importante:** Recuerda tomar captura legible a tu voucher y adjuntarlo en el formulario de matrícula para confirmar tu vacante.`;
    }

    if (texto.includes('curso') || texto.includes('precio') || texto.includes('costo') || texto.includes('inversion') || texto.includes('inversión') || texto.includes('programas') || texto.includes('oferta')) {
        return `📚 **Oferta Académica APECC:**\n\n` +
               `• **Conciliación Extrajudicial:** S/ 380\n` +
               `• **Cursos de Derecho (S/ 300 c/u):** Derecho Penal, Procesal Penal, Derecho Civil, Familia, Procesal General, Constitucional y Técnicas de Contrainterrogatorio.\n` +
               `• **Diplomados (S/ 50 c/u - 1.5 meses):**\n` +
               `  - Ciencias Penales y Litigación\n` +
               `  - Derecho Constitucional y DD.HH.\n` +
               `• **Pasantías Internacionales (S/ 150 c/u - 15 días):**\n` +
               `  - Teoría del Delito y Lavado de Activos\n` +
               `  - Blanqueo de Capitales y Prueba\n\n` +
               `👉 Puedes hacer clic en **"Matricularme"** en cualquiera de las tarjetas para iniciar tu inscripción.`;
    }

    if (texto.includes('conciliacion') || texto.includes('conciliación')) {
        return `🤝 **Curso Especializado en Conciliación Extrajudicial:**\n\n` +
               `- **Inversión:** S/ 380.00\n` +
               `- **Enfoque:** Capacitación práctica en técnicas de resolución pacífica y alternativa de conflictos jurídicos.\n` +
               `- **Modalidad:** Virtual con clases y materiales oficiales.\n` +
               `- **Certificación:** Emitida por APECC al culminar satisfactoriamente el programa.`;
    }

    if (texto.includes('diplomado')) {
        return `🎓 **Diplomados APECC:**\n\n` +
               `1. **Diplomado en Ciencias Penales y Litigación** (Inversión: S/ 50.00 | Duración: 1.5 meses)\n` +
               `2. **Diplomado en Derecho Constitucional y DD.HH.** (Inversión: S/ 50.00 | Duración: 1.5 meses)\n\n` +
               `Ambos programas otorgan certificación de perfeccionamiento profesional continuo.`;
    }

    if (texto.includes('pasantia') || texto.includes('pasantía')) {
        return `🌍 **Pasantías Internacionales APECC:**\n\n` +
               `1. **Teoría del Delito y Lavado de Activos** (Inversión: S/ 150.00 | Duración: 15 días)\n` +
               `2. **Blanqueo de Capitales y Prueba** (Inversión: S/ 150.00 | Duración: 15 días)\n\n` +
               `Incluyen análisis intensivo de litigación internacional y delitos financieros.`;
    }

    if (texto.includes('requisito') || texto.includes('como matricularme') || texto.includes('pasos') || texto.includes('inscribirme') || texto.includes('matricula') || texto.includes('matrícula')) {
        return `📝 **Pasos para matricularte en APECC:**\n\n` +
               `1. Elige tu programa en el catálogo y pulsa **"Matricularme"**.\n` +
               `2. Completa tus datos personales: Nombre completo, DNI (8 dígitos), correo y WhatsApp.\n` +
               `3. Selecciona tu método de pago (Yape/Plin o transferencia BCP).\n` +
               `4. Adjunta la foto o captura legible de tu voucher de pago.\n` +
               `5. Haz clic en **"Completar Registro y Confirmar Pago"**.\n` +
               `6. El sistema generará tu Constancia Digital con código oficial de matrícula.`;
    }

    if (texto.includes('hola') || texto.includes('buenos') || texto.includes('buenas') || texto.includes('ayuda') || texto.includes('saludos')) {
        return `👋 ¡Hola! Te doy la bienvenida al **Centro de Orientación y Matrículas de APECC**.\n\n` +
               `¿En qué puedo ayudarte hoy? Puedes consultarme sobre:\n` +
               `• Precios e información de cursos y diplomados\n` +
               `• Pasos para matricularte en línea\n` +
               `• Métodos de pago oficiales (Yape y BCP)\n` +
               `• Carga y validación de vouchers de pago`;
    }

    return `Estimado(a) postulante, para brindarte la mejor asistencia sobre tu matrícula en APECC, puedes preguntarme sobre nuestra oferta académica (Cursos especializados, Diplomados, Pasantías), los costos de inscripción, las cuentas de pago autorizadas o los pasos para subir tu voucher. ¿Sobre qué programa te gustaría información?`;
}

/**
 * POST /api/chatbot
 */
app.post('/api/chatbot', (req, res) => {
    const { mensaje } = req.body;

    if (!mensaje || typeof mensaje !== 'string' || mensaje.trim() === '') {
        return res.status(400).json({
            status: 'error',
            respuesta: 'Por favor envía un mensaje con tu consulta.'
        });
    }

    const mensajeLimpio = mensaje.trim();

    // 🛡️ Filtro heurístico contra Inyección de Prompts
    if (detectarInyeccion(mensajeLimpio)) {
        logger.warn(`🚨 [SEGURIDAD CHATBOT] Intento de inyección bloqueado: "${mensajeLimpio}" de IP: ${req.ip}`);
        return res.status(200).json({
            status: 'seguridad_activada',
            alerta: true,
            respuesta: '⚠️ [Alerta de Seguridad APECC]: Solicitud no permitida. Este asistente opera bajo estrictos protocolos de ciberseguridad y solo está autorizado para brindar información sobre las matrículas y programas académicos de APECC.'
        });
    }

    try {
        const respuestaBot = responderConsultaAcademica(mensajeLimpio);
        return res.json({
            status: 'success',
            alerta: false,
            respuesta: respuestaBot
        });
    } catch (error) {
        logger.error('Error al procesar consulta del chatbot:', error);
        return res.status(500).json({
            status: 'error',
            respuesta: 'Ocurrió un error al procesar tu consulta. Por favor intenta nuevamente.'
        });
    }
});

// ------------------------------------------------------------------------------
// 7. INICIALIZACIÓN DE SERVIDORES (HTTP Y HTTPS CON TLS)
// ------------------------------------------------------------------------------

// Iniciar Servidor HTTP estándar
const httpServer = http.createServer(app);
httpServer.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Servidor APECC Seguro activo (HTTP): http://localhost:${PORT}`);
    console.log(`📂 Web Principal: http://localhost:${PORT}/index.html`);
    console.log(`📂 Panel Administrativo: http://localhost:${PORT}/admin.html`);
    console.log(`=======================================================`);
});

// Comprobar certificados para inicializar servidor HTTPS seguro
const certPath = path.join(__dirname, 'certs', 'cert.pem');
const keyPath = path.join(__dirname, 'certs', 'key.pem');
let httpsServer = null;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    try {
        const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };

        httpsServer = https.createServer(httpsOptions, app);
        httpsServer.listen(PORT_HTTPS, () => {
            console.log(`🔒 Servidor Seguro HTTPS (TLS) activo en: https://localhost:${PORT_HTTPS}`);
        });
    } catch (err) {
        logger.warn('⚠️ No se pudo inicializar HTTPS:', err.message);
    }
}

function cerrarServidores(callback) {
    if (httpsServer) {
        try { httpsServer.close(); } catch (_) {}
    }
    try {
        httpServer.close(callback);
    } catch (_) {
        if (callback) callback();
    }
}

module.exports = { app, httpServer, cerrarServidores, db };