/**
 * ==============================================================================
 * SCRIPT DE LIMPIEZA / REINICIO DE BASE DE DATOS (APECC)
 * Elimina registros de prueba y reinicia el contador de IDs para presentaciones.
 * ==============================================================================
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(__dirname, '../base_datos.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al abrir la base de datos:', err.message);
        process.exit(1);
    }
});

console.log('====================================================');
console.log('🧹 INICIANDO LIMPIEZA DE BASE DE DATOS APECC');
console.log('====================================================');

db.serialize(() => {
    db.run('DELETE FROM matriculas;', function (err) {
        if (err) {
            console.error('❌ Error al vaciar la tabla "matriculas":', err.message);
            return;
        }
        console.log('🗑️  Registros de matrículas eliminados con éxito.');
    });

    db.run("DELETE FROM sqlite_sequence WHERE name='matriculas';", function (err) {
        if (!err) {
            console.log('🔢 Contador de ID reiniciado a 1.');
        }
    });

    db.get('SELECT COUNT(*) AS total FROM matriculas;', (err, row) => {
        if (err) {
            console.error('❌ Error al consultar conteo:', err.message);
        } else {
            console.log(`📊 Estado final: ${row.total} registros en la base de datos.`);
            console.log('✅ Base de datos 100% limpia y lista para tu sustentación.');
            console.log('====================================================');
        }
        db.close();
    });
});
