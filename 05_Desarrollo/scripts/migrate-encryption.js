/**
 * ==============================================================================
 * SCRIPT DE MIGRACIÓN Y CIFRADO DE BASE DE DATOS (MIGRATE-ENCRYPTION.JS)
 * Cifra datos existentes en texto plano a formato AES-256 en SQLite
 * ==============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { encryptData } = require('../utils/encryption');

const dbPath = path.join(__dirname, '..', 'base_datos.db');
const db = new sqlite3.Database(dbPath);

async function migrateEncryption() {
    console.log('🚀 Iniciando proceso de migración y cifrado de datos sensibles...');

    return new Promise((resolve, reject) => {
        // 1. Verificar y agregar columnas si no existen
        db.serialize(() => {
            db.run(`ALTER TABLE matriculas ADD COLUMN nombre_encrypted TEXT`, () => {});
            db.run(`ALTER TABLE matriculas ADD COLUMN dni_encrypted TEXT`, () => {});
            db.run(`ALTER TABLE matriculas ADD COLUMN correo_encrypted TEXT`, () => {});
            db.run(`ALTER TABLE matriculas ADD COLUMN telefono_encrypted TEXT`, () => {});

            // 2. Consultar registros existentes
            db.all('SELECT id, nombre, dni, correo, telefono, nombre_encrypted, dni_encrypted FROM matriculas', (err, rows) => {
                if (err) {
                    console.error('❌ Error al consultar la tabla matriculas:', err);
                    db.close();
                    return reject(err);
                }

                if (!rows || rows.length === 0) {
                    console.log('ℹ️ No hay registros previos que migrar. Estructura preparada correctamente.');
                    db.close();
                    return resolve();
                }

                console.log(`📋 Registros encontrados para evaluar cifrado: ${rows.length}`);
                let procesados = 0;
                let actualizados = 0;

                rows.forEach((row) => {
                    // Cifrar solo si no tiene ya valor cifrado
                    const nombreEnc = row.nombre_encrypted || encryptData(row.nombre);
                    const dniEnc = row.dni_encrypted || encryptData(row.dni);
                    const correoEnc = row.correo_encrypted || encryptData(row.correo);
                    const telefonoEnc = row.telefono_encrypted || encryptData(row.telefono);

                    db.run(
                        `UPDATE matriculas 
                         SET nombre_encrypted = ?, dni_encrypted = ?, correo_encrypted = ?, telefono_encrypted = ?
                         WHERE id = ?`,
                        [nombreEnc, dniEnc, correoEnc, telefonoEnc, row.id],
                        (updateErr) => {
                            if (updateErr) {
                                console.error(`❌ Error actualizando registro ID ${row.id}:`, updateErr.message);
                            } else {
                                actualizados++;
                            }

                            procesados++;
                            if (procesados === rows.length) {
                                console.log(`🔒 Migración finalizada: ${actualizados} registros actualizados con cifrado AES-256.`);
                                db.close();
                                resolve();
                            }
                        }
                    );
                });
            });
        });
    });
}

if (require.main === module) {
    migrateEncryption()
        .then(() => console.log('✅ Proceso completado exitosamente.'))
        .catch(err => console.error('❌ Error en migración:', err));
}

module.exports = { migrateEncryption };
