/**
 * ==============================================================================
 * PROYECTO INTEGRADOR APECC - FRONTEND LOGIC (APP.JS)
 * Conexión Asíncrona con el Backend Node.js, Matrícula y Chatbot Seguro
 * ==============================================================================
 */

// Detección dinámica y soporte de túnel seguro (Ngrok / Localtunnel / Localhost)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('backend')) {
    localStorage.setItem('apecc_backend_url', urlParams.get('backend').replace(/\/$/, ''));
}
//const API_URL = localStorage.getItem('apecc_backend_url')
 //   || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:3000' : '');
const API_URL = 'http://localhost:3000';

// ------------------------------------------------------------------------------
// 1. GESTIÓN DEL MODAL DE MATRÍCULA Y PASARELA
// ------------------------------------------------------------------------------
function abrirMatricula(nombreCurso, precio) {
    document.getElementById('subtitulo-curso').textContent = `Programa: ${nombreCurso}`;
    document.getElementById('curso-seleccionado').value = nombreCurso;
    document.getElementById('precio-seleccionado').value = precio;
    document.getElementById('monto-total-pantalla').textContent = `S/ ${precio}.00`;
    document.getElementById('modal-matricula').style.display = 'flex';
}

function cerrarMatricula() {
    document.getElementById('modal-matricula').style.display = 'none';
    document.getElementById('form-registro').reset();
    cambiarMetodoPago();
}

function cambiarMetodoPago() {
    const metodo = document.getElementById('metodo-pago').value;
    const vistaQR = document.getElementById('vista-qr');
    const vistaBCP = document.getElementById('vista-bcp');

    if (metodo === 'Yape') {
        vistaQR.style.display = 'block';
        vistaBCP.style.display = 'none';
    } else {
        vistaQR.style.display = 'none';
        vistaBCP.style.display = 'block';
    }
}

// ------------------------------------------------------------------------------
// 2. ENVÍO Y REGISTRO DE MATRÍCULA HACIA EL BACKEND NODE.JS + SQLITE
// ------------------------------------------------------------------------------
async function procesarMatriculaDirecta(event) {
    event.preventDefault();

    const fileInput = document.getElementById('voucher-file');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Por favor adjunta la captura o foto de tu comprobante de pago.');
        return;
    }

    const btn = document.getElementById('btn-procesar');
    btn.disabled = true;
    btn.textContent = '⏳ Conectando con el servidor y guardando...';

    const archivo = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
        const voucherBase64 = e.target.result;

        const curso = document.getElementById('curso-seleccionado').value;
        const precio = document.getElementById('precio-seleccionado').value;
        const nombre = document.getElementById('nombre').value.trim();
        const dni = document.getElementById('dni').value.trim();
        const correo = document.getElementById('correo').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const metodoPago = document.getElementById('metodo-pago').value;

        const codigoMatricula = 'APECC-' + Math.floor(100000 + Math.random() * 900000);
        const transaccionId = 'TXN-' + Math.floor(1000000 + Math.random() * 9000000);
        const fechaHora = new Date().toLocaleDateString('es-PE') + ' ' + new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

        const payloadMatricula = {
            codigo: codigoMatricula,
            transaccion: transaccionId,
            curso: curso,
            monto: `S/ ${precio}.00`,
            nombre: nombre,
            dni: dni,
            correo: correo,
            telefono: telefono,
            metodo: metodoPago,
            voucher: voucherBase64,
            estado: 'Pendiente',
            fecha: fechaHora
        };

        try {
            // Conexión real con el backend Node.js
            const respuesta = await fetch(`${API_URL}/api/matriculas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payloadMatricula)
            });

            const data = await respuesta.json();

            if (respuesta.ok && data.status === 'success') {
                console.log('✅ Matrícula guardada exitosamente en la BD SQLite:', data);
                payloadMatricula.codigo = data.codigo || payloadMatricula.codigo;
                payloadMatricula.transaccion = data.transaccion || payloadMatricula.transaccion;
            } else if (!respuesta.ok) {
                const primerError = data.errors && data.errors.length > 0 ? data.errors[0].mensaje : data.message;
                alert('⚠️ Error de validación: ' + (primerError || 'Revise los campos del formulario.'));
                btn.disabled = false;
                btn.textContent = 'Completar Registro y Confirmar Pago';
                return;
            } else {
                console.warn('⚠️ El servidor respondió con advertencia:', data.message);
            }
        } catch (error) {
            console.error('⚠️ No se pudo conectar con el servidor Node.js. Guardando respaldo local...', error);
            alert('Aviso: El servidor Backend no está activo en este momento. La matrícula se guardará en la memoria local.');
        } finally {
            // Guardar en localStorage como respaldo / offline cache
            let matriculasLocales = JSON.parse(localStorage.getItem('matriculasAPECC')) || [];
            matriculasLocales.push(payloadMatricula);
            localStorage.setItem('matriculasAPECC', JSON.stringify(matriculasLocales));

            btn.disabled = false;
            btn.textContent = 'Completar Registro y Confirmar Pago';

            cerrarMatricula();
            mostrarConstancia(payloadMatricula);
        }
    };

    reader.readAsDataURL(archivo);
}

function mostrarConstancia(datos) {
    document.getElementById('resumen-codigo').textContent = datos.codigo;
    document.getElementById('resumen-transaccion').textContent = datos.transaccion;
    document.getElementById('resumen-nombre').textContent = datos.nombre;
    document.getElementById('resumen-dni').textContent = datos.dni;
    document.getElementById('resumen-curso').textContent = datos.curso;

    document.getElementById('modal-exito').style.display = 'flex';
}

function cerrarExito() {
    document.getElementById('modal-exito').style.display = 'none';
}

// ------------------------------------------------------------------------------
// 3. MÓDULO DEL CHATBOT DE MATRÍCULAS (CLIENTE ASÍNCRONO SEGURO)
// ------------------------------------------------------------------------------

function toggleChatbot() {
    const ventana = document.getElementById('chatbot-window');
    if (!ventana) return;

    if (ventana.style.display === 'flex') {
        ventana.style.display = 'none';
    } else {
        ventana.style.display = 'flex';
        const input = document.getElementById('chatbot-input');
        if (input) input.focus();
        scrollChatbotBottom();
    }
}

function enviarPreguntaRapida(texto) {
    const input = document.getElementById('chatbot-input');
    if (!input) return;
    input.value = texto;
    enviarMensajeChatbot(new Event('submit'));
}

async function enviarMensajeChatbot(event) {
    if (event) event.preventDefault();

    const input = document.getElementById('chatbot-input');
    const mensaje = input.value.trim();
    if (!mensaje) return;

    // 1. Agregar mensaje del usuario en la interfaz
    agregarMensajeVisual('usuario', mensaje);
    input.value = '';

    // 2. Mostrar indicador de respuesta ("escribiendo...")
    const idIndicador = mostrarIndicadorEscribiendo();
    scrollChatbotBottom();

    try {
        // 3. Petición POST al endpoint seguro de ciberseguridad
        const res = await fetch(`${API_URL}/api/chatbot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mensaje: mensaje })
        });

        const data = await res.json();
        removerIndicadorEscribiendo(idIndicador);

        if (data.alerta) {
            // El backend detectó y bloqueó un intento de inyección de instrucciones
            agregarMensajeVisual('seguridad', data.respuesta);
        } else {
            // Respuesta normal del bot
            agregarMensajeVisual('bot', data.respuesta || 'Disculpa, no pude procesar la respuesta.');
        }
    } catch (err) {
        console.error('Error al comunicarse con el chatbot:', err);
        removerIndicadorEscribiendo(idIndicador);
        agregarMensajeVisual('bot', '⚠️ No pude conectarme con el servidor de APECC. Asegúrate de que el backend (node server.js) esté corriendo en el puerto 3000.');
    }

    scrollChatbotBottom();
}

function agregarMensajeVisual(tipo, texto) {
    const contenedor = document.getElementById('chatbot-mensajes');
    if (!contenedor) return;

    const fila = document.createElement('div');
    fila.className = `mensaje-fila ${tipo === 'seguridad' ? 'bot' : tipo}`;

    // Convertir saltos de línea y formatear negritas básicas para presentación limpia
    let contenidoFormateado = texto
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    if (tipo === 'usuario') {
        fila.innerHTML = `<div class="mensaje-burbuja">${contenidoFormateado}</div>`;
    } else if (tipo === 'seguridad') {
        fila.innerHTML = `
            <div class="chatbot-avatar" style="width:28px; height:28px; font-size:0.9rem; background:#ef4444;">🛡️</div>
            <div class="mensaje-burbuja mensaje-alerta-seguridad">${contenidoFormateado}</div>
        `;
    } else {
        fila.innerHTML = `
            <div class="chatbot-avatar" style="width:28px; height:28px; font-size:0.9rem;">🤖</div>
            <div class="mensaje-burbuja">${contenidoFormateado}</div>
        `;
    }

    contenedor.appendChild(fila);
}

function mostrarIndicadorEscribiendo() {
    const contenedor = document.getElementById('chatbot-mensajes');
    if (!contenedor) return null;

    const id = 'typing-' + Date.now();
    const fila = document.createElement('div');
    fila.id = id;
    fila.className = 'mensaje-fila bot';
    fila.innerHTML = `
        <div class="chatbot-avatar" style="width:28px; height:28px; font-size:0.9rem;">🤖</div>
        <div class="chatbot-escribiendo">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    contenedor.appendChild(fila);
    return id;
}

function removerIndicadorEscribiendo(id) {
    if (!id) return;
    const elemento = document.getElementById(id);
    if (elemento) elemento.remove();
}

function scrollChatbotBottom() {
    const contenedor = document.getElementById('chatbot-mensajes');
    if (contenedor) {
        contenedor.scrollTop = contenedor.scrollHeight;
    }
}