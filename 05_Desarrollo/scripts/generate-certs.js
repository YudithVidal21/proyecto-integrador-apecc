/**
 * ==============================================================================
 * GENERADOR DE CERTIFICADOS SSL/TLS AUTO-FIRMADOS (GENERATE-CERTS.JS)
 * Para habilitar HTTPS local sin necesidad de OpenSSL instalado en Windows
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

async function generarCertificados() {
    const certsDir = path.join(__dirname, '..', 'certs');
    if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
    }

    const keyPath = path.join(certsDir, 'key.pem');
    const certPath = path.join(certsDir, 'cert.pem');

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        console.log('✅ Certificados SSL ya existen en:', certsDir);
        return { keyPath, certPath };
    }

    try {
        const selfsigned = require('selfsigned');
        console.log('🔑 Generando certificados SSL auto-firmados de 2048 bits para APECC...');
        const pems = await selfsigned.generate(null, { days: 365 });

        fs.writeFileSync(keyPath, pems.private);
        fs.writeFileSync(certPath, pems.cert);

        console.log('✅ Clave privada guardada en:', keyPath);
        console.log('✅ Certificado público guardado en:', certPath);
        return { keyPath, certPath };
    } catch (err) {
        console.warn('⚠️ No se pudo generar certificado SSL:', err.message);
        return null;
    }
}

if (require.main === module) {
    generarCertificados();
}

module.exports = { generarCertificados };
