/**
 * ==============================================================================
 * MÓDULO DE AUDITORÍA Y LOGGING CENTRALIZADO (LOGGER.JS)
 * Basado en Winston para registro de accesos, fallos y eventos críticos
 * ==============================================================================
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Asegurar que exista el directorio de logs
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`;
    })
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    defaultMeta: { service: 'apecc-matriculas-api' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                customFormat
            )
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5
        })
    ]
});

/**
 * Método de conveniencia para registrar eventos de auditoría administrativa
 */
logger.audit = function (action, details = {}) {
    logger.info(`[AUDIT] ${action}`, details);
    try {
        const auditLogPath = path.join(logsDir, 'audit.log');
        const line = `[${new Date().toISOString()}] [AUDIT] ${action} ${JSON.stringify(details)}\n`;
        fs.appendFileSync(auditLogPath, line);
    } catch (err) {
        console.error('Error al escribir en audit.log:', err.message);
    }
};

module.exports = logger;
