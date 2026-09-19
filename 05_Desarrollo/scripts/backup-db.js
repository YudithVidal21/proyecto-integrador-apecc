/**
 * ==============================================================================
 * SCRIPT DE RESPALDO SEGURO DE BASE DE DATOS (BACKUP-DB.JS)
 * Copia de seguridad automatizada con timestamp y retención de snapshots
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

function crearRespaldo() {
    const dbPath = path.join(__dirname, '..', 'base_datos.db');
    const backupsDir = path.join(__dirname, '..', 'backups');

    if (!fs.existsSync(dbPath)) {
        console.error('❌ Base de datos no encontrada en:', dbPath);
        return null;
    }

    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_apecc_${timestamp}.db`;
    const destination = path.join(backupsDir, backupFileName);

    try {
        fs.copyFileSync(dbPath, destination);
        console.log(`✅ Respaldo de BD generado exitosamente: ${backupFileName}`);
        console.log(`📁 Ubicación: ${destination}`);

        // Rotación de backups: mantener solo los últimos 15
        const files = fs.readdirSync(backupsDir)
            .filter(f => f.startsWith('backup_apecc_') && f.endsWith('.db'))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 15) {
            const toDelete = files.slice(15);
            toDelete.forEach(file => {
                fs.unlinkSync(path.join(backupsDir, file.name));
                console.log(`🧹 Respaldo antiguo eliminado por política de retención: ${file.name}`);
            });
        }

        return destination;
    } catch (err) {
        console.error('❌ Error al realizar copia de seguridad:', err.message);
        throw err;
    }
}

if (require.main === module) {
    crearRespaldo();
}

module.exports = { crearRespaldo };
