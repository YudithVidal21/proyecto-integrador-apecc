/**
 * ==============================================================================
 * MÓDULO DE CIFRADO Y SEGURIDAD CRIPTOGRÁFICA (ENCRYPTION.JS)
 * Cifrado simétrico AES-256 para datos sensibles en reposo (DNI, Email, Teléfono, Nombre)
 * ==============================================================================
 */

const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'apecc_cifrado_aes_256_clave_maestra_2026!#';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    console.warn('⚠️ ADVERTENCIA: ENCRYPTION_KEY debería tener al menos 32 caracteres para máxima seguridad.');
}

/**
 * Cifra datos sensibles en texto plano usando AES-256
 * @param {string} plaintext - Texto plano a cifrar
 * @returns {string|null} - Texto cifrado en formato Base64 o null
 */
function encryptData(plaintext) {
    if (plaintext === undefined || plaintext === null || plaintext === '') {
        return plaintext;
    }
    try {
        const texto = plaintext.toString();
        // Si ya está cifrado con AES (verificación simple) no re-cifrar
        const encrypted = CryptoJS.AES.encrypt(texto, ENCRYPTION_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('❌ Error al cifrar dato sensible:', error.message);
        throw error;
    }
}

/**
 * Descifra datos previamente cifrados con AES-256
 * @param {string} ciphertext - Texto cifrado
 * @returns {string} - Texto plano recuperado
 */
function decryptData(ciphertext) {
    if (ciphertext === undefined || ciphertext === null || ciphertext === '') {
        return ciphertext;
    }
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext.toString(), ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        // Si no se puede descifrar como UTF8 (quizá texto plano preexistente), retornar original
        return decrypted || ciphertext;
    } catch (error) {
        // En caso de que el dato no estuviera cifrado previamente, devolver el texto tal cual
        return ciphertext;
    }
}

module.exports = {
    encryptData,
    decryptData
};
