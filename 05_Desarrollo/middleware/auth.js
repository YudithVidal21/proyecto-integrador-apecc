/**
 * ==============================================================================
 * MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN JWT (AUTH.JS)
 * Verificación de tokens de sesión y privilegios de administrador
 * ==============================================================================
 */

const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Token no proporcionado. Acceso denegado.'
        });
    }

    const secret = process.env.JWT_SECRET || 'apecc_jwt_super_secret_key_2026_securizada_con_defensa_en_profundidad_x99';

    try {
        const decoded = jwt.verify(token, secret);
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
            message: 'Token inválido o manipulado.'
        });
    }
}

function verifyAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'Acceso restringido. Solo administradores pueden realizar esta acción.'
        });
    }
    next();
}

module.exports = {
    verifyToken,
    verifyAdmin
};
