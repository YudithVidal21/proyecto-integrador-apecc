/**
 * ==============================================================================
 * REGLAS DE VALIDACIÓN Y SANITIZACIÓN DE INPUT (VALIDATORS.JS)
 * Basado en express-validator para mitigación de XSS, SQLi y Bad Input
 * ==============================================================================
 */

const { body, param, validationResult } = require('express-validator');

/**
 * Middleware para procesar resultados de validación y retornar errores estructurados
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            message: 'Validación de datos fallida.',
            errors: errors.array().map(err => ({
                campo: err.path || err.param,
                mensaje: err.msg
            }))
        });
    }
    next();
};

/**
 * Reglas de validación para registro de nueva matrícula
 */
const validateMatricula = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre completo es obligatorio.')
        .isLength({ min: 3, max: 120 }).withMessage('El nombre debe tener entre 3 y 120 caracteres.')
        .matches(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s\.\'-]+$/).withMessage('El nombre solo puede contener letras y espacios.')
        .escape(),

    body('dni')
        .trim()
        .notEmpty().withMessage('El DNI es obligatorio.')
        .isLength({ min: 8, max: 8 }).withMessage('El DNI debe tener exactamente 8 dígitos.')
        .isNumeric().withMessage('El DNI solo puede contener números.'),

    body('correo')
        .trim()
        .notEmpty().withMessage('El correo electrónico es obligatorio.')
        .isEmail().withMessage('El formato del correo electrónico no es válido.')
        .normalizeEmail({ gmail_remove_dots: false }),

    body('telefono')
        .trim()
        .notEmpty().withMessage('El número de teléfono/WhatsApp es obligatorio.')
        .matches(/^\+?[0-9]{7,15}$/).withMessage('El número de teléfono debe tener entre 7 y 15 dígitos numéricos.'),

    body('curso')
        .trim()
        .notEmpty().withMessage('El curso o programa es obligatorio.')
        .isLength({ min: 3, max: 150 }).withMessage('El nombre del curso debe tener entre 3 y 150 caracteres.')
        .escape(),

    body('monto')
        .trim()
        .notEmpty().withMessage('El monto de la matrícula es obligatorio.')
        .custom((valor) => {
            const num = parseFloat(String(valor).replace(/[^0-9.]/g, ''));
            if (isNaN(num) || num < 10 || num > 10000) {
                throw new Error('El monto debe ser un valor monetario válido entre S/ 10 y S/ 10,000.');
            }
            return true;
        }),

    body('metodo')
        .trim()
        .notEmpty().withMessage('El método de pago es obligatorio.')
        .isIn(['Yape', 'Plin', 'BCP']).withMessage('El método de pago debe ser Yape, Plin o BCP.'),

    body('voucher')
        .optional({ checkFalsy: true })
        .isString().withMessage('El comprobante/voucher debe ser una cadena válida.')
        .isLength({ max: 35000000 }).withMessage('El comprobante excede el tamaño máximo permitido (25MB).'),

    body('codigo')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[A-Za-z0-9\-_]+$/).withMessage('Código con caracteres inválidos.'),

    body('transaccion')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[A-Za-z0-9\-_]+$/).withMessage('Transacción con caracteres inválidos.')
];

/**
 * Reglas de validación para actualización de estado administrativo
 */
const validateEstado = [
    param('id')
        .isInt({ min: 1 }).withMessage('El ID de matrícula debe ser un número entero válido.'),

    body('estado')
        .trim()
        .notEmpty().withMessage('El estado es obligatorio.')
        .isIn(['Pendiente', 'Aprobado', 'Rechazado']).withMessage('Estado inválido. Debe ser Pendiente, Aprobado o Rechazado.')
];

module.exports = {
    validateMatricula,
    validateEstado,
    handleValidationErrors
};
