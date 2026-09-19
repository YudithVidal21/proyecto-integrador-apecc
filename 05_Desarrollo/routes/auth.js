/**
 * ==============================================================================
 * ENPOINTS DE AUTENTICACIÓN Y SEGURIDAD (AUTH.JS)
 * Autenticación administrativa con JWT, Rate Limiting y Trazabilidad
 * ==============================================================================
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiter específico para mitigar ataques de fuerza bruta en el login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
    max: 5, // Máximo 5 intentos fallidos o solicitudes por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Demasiados intentos de acceso desde esta dirección IP. Por favor espere 15 minutos e intente nuevamente.'
    },
    skipSuccessfulRequests: true // Solo penaliza solicitudes no exitosas
});

/**
 * POST /auth/login
 * Autenticación de credenciales de administrador y entrega de token JWT
 */
router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Validación básica de parámetros
    if (!username || !password) {
        logger.warn(`Intento de login con campos incompletos desde IP ${clientIp}`);
        return res.status(400).json({
            status: 'error',
            message: 'Debe ingresar nombre de usuario y contraseña.'
        });
    }

    const adminUser = process.env.ADMIN_USERNAME || 'admin_apecc';
    const adminPassHash = process.env.ADMIN_PASSWORD_HASH || '$2b$10$V3PfWz24d/kZEQ8frgljoeQ2DYNdxyKNb9r36U3Ga0PJQYakhAX/i';

    // Verificación de usuario
    if (username.trim() !== adminUser) {
        logger.warn(`Intento fallido de login con usuario desconocido: "${username}" desde IP ${clientIp}`);
        return res.status(401).json({
            status: 'error',
            message: 'Credenciales de acceso inválidas.'
        });
    }

    try {
        // Comparación criptográfica segura con Bcrypt contra el hash en variable de entorno
        const passwordMatch = await bcrypt.compare(password, adminPassHash);

        if (!passwordMatch) {
            logger.warn(`Contraseña incorrecta para el usuario admin "${username}" desde IP ${clientIp}`);
            return res.status(401).json({
                status: 'error',
                message: 'Credenciales de acceso inválidas.'
            });
        }

        const jwtSecret = process.env.JWT_SECRET || 'apecc_jwt_super_secret_key_2026_securizada_con_defensa_en_profundidad_x99';
        const jwtExpire = process.env.JWT_EXPIRE || '24h';

        // Generación del token JWT firmado
        const payload = {
            id: 1,
            username: adminUser,
            role: 'admin',
            iat: Math.floor(Date.now() / 1000)
        };

        const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire });

        logger.audit('LOGIN_SUCCESS', {
            username: adminUser,
            ip: clientIp,
            timestamp: new Date().toISOString()
        });

        return res.json({
            status: 'success',
            message: 'Autenticación exitosa. Bienvenido al Panel APECC.',
            token: token,
            expiresIn: jwtExpire,
            user: {
                username: adminUser,
                role: 'admin'
            }
        });

    } catch (error) {
        logger.error('Error interno durante autenticación:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno en el servidor de autenticación.'
        });
    }
});

/**
 * GET /auth/verify
 * Verifica si el token almacenado sigue siendo válido
 */
router.get('/verify', verifyToken, (req, res) => {
    return res.json({
        status: 'success',
        message: 'Token válido.',
        user: req.user
    });
});

module.exports = router;
