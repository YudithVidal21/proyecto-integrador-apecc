/**
 * ==============================================================================
 * CONFIGURACIÓN DE POLÍTICA DE SEGURIDAD CORS (CORS.JS)
 * Restringe el acceso cruzado únicamente a dominios institucionales autorizados
 * ==============================================================================
 */

const cors = require('cors');

const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,https://apecc.org,https://www.apecc.org';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

// Añadir orígenes comunes de desarrollo si estamos en modo development
if (process.env.NODE_ENV !== 'production') {
    if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');
    if (!allowedOrigins.includes('http://127.0.0.1:3000')) allowedOrigins.push('http://127.0.0.1:3000');
    if (!allowedOrigins.includes('http://localhost:3443')) allowedOrigins.push('http://localhost:3443');
    if (!allowedOrigins.includes('http://localhost:5500')) allowedOrigins.push('http://localhost:5500');
}

const corsOptions = {
    origin: (origin, callback) => {
        // Permitir solicitudes locales, herramientas backend y dominios de Vercel/Túnel autorizados
        const isVercelOrTunnel = origin && (
            origin.endsWith('.vercel.app') || 
            origin.endsWith('.loca.lt') || 
            origin.endsWith('.ngrok-free.app') ||
            origin.endsWith('.ngrok.app')
        );

        if (!origin || allowedOrigins.includes(origin) || isVercelOrTunnel) {
            callback(null, true);
        } else {
            callback(new Error(`Acceso denegado por política CORS para el origen: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400 // 24 horas de cache preflight
};

module.exports = cors(corsOptions);
