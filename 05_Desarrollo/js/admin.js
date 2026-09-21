/**
 * ==============================================================================
 * PROYECTO INTEGRADOR APECC - PANEL ADMINISTRATIVO (ADMIN.JS)
 * Gestión y Validación de Matrículas en Tiempo Real con JWT y Descifrado Seguro
 * ==============================================================================
 */

// Detección dinámica y soporte de túnel seguro (Ngrok / Localtunnel / Localhost)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('backend')) {
    localStorage.setItem('apecc_backend_url', urlParams.get('backend').replace(/\/$/, ''));
}
const API_URL = localStorage.getItem('apecc_backend_url')
    || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:3000' : '');


const TOKEN_KEY = 'apecc_jwt_token';
const USER_KEY = 'apecc_jwt_user';

document.addEventListener('DOMContentLoaded', () => {
    verificarEstadoAutenticacion();
});

function obtenerToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

function verificarEstadoAutenticacion() {
    const token = obtenerToken();
    const modalLogin = document.getElementById('modal-login-admin');
    const badgeUsuario = document.getElementById('badge-usuario');
    const btnCerrar = document.getElementById('btn-cerrar-sesion');
    const userDisplay = document.getElementById('nombre-usuario-display');

    if (!token) {
        // Mostrar modal de login si no hay token
        if (modalLogin) modalLogin.style.display = 'flex';
        if (badgeUsuario) badgeUsuario.style.display = 'none';
        if (btnCerrar) btnCerrar.style.display = 'none';
        return false;
    } else {
        if (modalLogin) modalLogin.style.display = 'none';
        if (badgeUsuario) badgeUsuario.style.display = 'inline-block';
        if (btnCerrar) btnCerrar.style.display = 'inline-block';
        if (userDisplay) {
            userDisplay.textContent = sessionStorage.getItem(USER_KEY) || 'admin_apecc';
        }
        cargarMatriculas();
        return true;
    }
}

async function iniciarSesion(event) {
    if (event) event.preventDefault();

    const userInput = document.getElementById('admin-user');
    const passInput = document.getElementById('admin-pass');
    const errorMsg = document.getElementById('login-error-msg');
    const btnSubmit = document.getElementById('btn-login-submit');

    const username = userInput.value.trim();
    const password = passInput.value;

    if (!username || !password) {
        errorMsg.textContent = 'Por favor complete todos los campos.';
        errorMsg.style.display = 'block';
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = '⏳ Verificando credenciales...';
    errorMsg.style.display = 'none';

    try {
        const res = await fetch(`http://localhost:3000/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.status === 'success' && data.token) {
            sessionStorage.setItem(TOKEN_KEY, data.token);
            sessionStorage.setItem(USER_KEY, data.user?.username || username);
            passInput.value = '';
            verificarEstadoAutenticacion();
        } else {
            errorMsg.textContent = data.message || 'Credenciales inválidas.';
            errorMsg.style.display = 'block';
        }
    } catch (err) {
        console.error('Error de red al intentar login:', err);
        errorMsg.textContent = 'Error de conexión con el servidor de autenticación.';
        errorMsg.style.display = 'block';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '🔐 Iniciar Sesión Segura';
    }
}

function togglePasswordVisibility() {
    const passInput = document.getElementById('admin-pass');
    const toggleBtn = document.getElementById('btn-toggle-pass');
    if (!passInput || !toggleBtn) return;
    if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

function cerrarSesion() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    const tbody = document.getElementById('tabla-matriculas');
    if (tbody) tbody.innerHTML = '';
    document.getElementById('stat-total').textContent = '0';
    document.getElementById('stat-pendientes').textContent = '0';
    document.getElementById('stat-aprobados').textContent = 'S/ 0.00';
    verificarEstadoAutenticacion();
}

async function cargarMatriculas() {
    const token = obtenerToken();
    if (!token) {
        verificarEstadoAutenticacion();
        return;
    }

    const tbody = document.getElementById('tabla-matriculas');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align:center; padding:2rem; color:#64748b;">
                ⏳ Consultando y descifrando matrículas de forma segura...
            </td>
        </tr>`;

    let matriculas = [];

    try {
        const res = await fetch(`http://localhost:3000/api/matriculas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status === 401 || res.status === 403) {
            console.warn('⚠️ Token expirado o no autorizado. Solicitando login.');
            cerrarSesion();
            return;
        }

        if (res.ok) {
            matriculas = await res.json();
            console.log('✅ Matrículas cargadas y descifradas:', matriculas.length);
        } else {
            throw new Error('Respuesta no satisfactoria del servidor');
        }
    } catch (err) {
        console.warn('⚠️ No se pudo consultar la API protegida.', err);
        matriculas = [];
    }

    tbody.innerHTML = '';

    if (!matriculas || matriculas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:2rem; color:#64748b;">
                    Aún no hay matrículas registradas en el sistema.
                </td>
            </tr>`;
        document.getElementById('stat-total').textContent = '0';
        document.getElementById('stat-pendientes').textContent = '0';
        document.getElementById('stat-aprobados').textContent = 'S/ 0.00';
        return;
    }

    let totalInscritos = matriculas.length;
    let pendientesCount = 0;
    let aprobadosCount = 0;
    let recaudacionTotal = 0;

    matriculas.forEach((item) => {
        const estado = item.estado || 'Pendiente';
        if (estado === 'Pendiente') pendientesCount++;
        if (estado === 'Aprobado') {
            aprobadosCount++;
            const montoLimpio = parseFloat(String(item.monto).replace(/[^0-9.]/g, '')) || 0;
            recaudacionTotal += montoLimpio;
        }

        let badgeClass = 'badge-pendiente';
        if (estado === 'Aprobado') badgeClass = 'badge-aprobado';
        if (estado === 'Rechazado') badgeClass = 'badge-rechazado';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${item.codigo || 'S/C'}</strong><br>
                <small style="color:#64748b;">${item.transaccion || '-'}</small><br>
                <small style="color:#94a3b8; font-size:0.75rem;">📅 ${item.fecha || ''}</small>
            </td>
            <td>
                <strong>${item.nombre}</strong><br>
                <small style="color:#0284c7;">✉️ ${item.correo || 'Sin correo'}</small><br>
                <small style="color:#16a34a;">📱 ${item.telefono || 'Sin tel.'}</small>
            </td>
            <td><strong>${item.dni}</strong></td>
            <td>${item.curso}</td>
            <td>
                <strong style="color:#16a34a;">${item.monto}</strong><br>
                <small style="color:#0284c7; font-weight:600;">${item.metodo}</small>
            </td>
            <td>
                ${item.voucher 
                    ? `<a href="${item.voucher}" target="_blank" style="background:#0284c7; color:white; padding:0.35rem 0.6rem; border-radius:4px; text-decoration:none; font-size:0.8rem; font-weight:bold; display:inline-block;">🔎 Ver Comprobante</a>` 
                    : '<span style="color:#ef4444; font-size:0.85rem;">Sin voucher</span>'
                }
            </td>
            <td>
                <span class="badge ${badgeClass}">${estado.toUpperCase()}</span>
            </td>
            <td>
                <button class="btn-accion btn-aprobar" title="Aprobar Matrícula" onclick="cambiarEstadoMatricula(${item.id || 'null'}, '${item.codigo}', 'Aprobado')">✓ Aprobar</button>
                <button class="btn-accion btn-rechazar" title="Rechazar Matrícula" onclick="cambiarEstadoMatricula(${item.id || 'null'}, '${item.codigo}', 'Rechazado')">✕ Rechazar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('stat-total').textContent = totalInscritos;
    document.getElementById('stat-pendientes').textContent = pendientesCount;
    document.getElementById('stat-aprobados').textContent = `S/ ${recaudacionTotal.toFixed(2)} (${aprobadosCount})`;
}

async function cambiarEstadoMatricula(id, codigo, nuevoEstado) {
    const token = obtenerToken();
    if (!token) {
        alert('Sesión no válida. Por favor inicie sesión.');
        verificarEstadoAutenticacion();
        return;
    }

    if (!confirm(`¿Confirmas cambiar el estado de la matrícula ${codigo} a "${nuevoEstado}"?`)) {
        return;
    }

    if (id) {
        try {
            const res = await fetch(`${API_URL}/api/matriculas/${id}/estado`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (res.status === 401 || res.status === 403) {
                alert('Sesión expirada. Debe autenticarse nuevamente.');
                cerrarSesion();
                return;
            }

            const data = await res.json();
            if (!res.ok) {
                alert('Error al actualizar en el servidor: ' + (data.message || 'Error desconocido'));
            }
        } catch (err) {
            console.error('Error al conectar con backend para actualizar estado:', err);
            alert('Error de conexión con el servidor.');
        }
    }

    // Recargar la tabla con datos actualizados
    cargarMatriculas();
}