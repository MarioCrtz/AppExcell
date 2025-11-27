// Sistema de almacenamiento de tareas (ahora sincronizado con backend)
let tasks = [];
let currentUser = null;
let currentTaskId = null;

// URL del backend
const API_BASE = 'http://localhost:3000';

// Elementos del DOM - Login
const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Elementos del DOM - Admin
const adminScreen = document.getElementById('adminScreen');
const taskForm = document.getElementById('taskForm');
const logoutBtnAdmin = document.getElementById('logoutBtnAdmin');
const adminUsername = document.getElementById('adminUsername');
const tasksList = document.getElementById('tasksList');
const filterMotorista = document.getElementById('filterMotorista');
const formMessage = document.getElementById('formMessage');

const filterDateStart = document.getElementById('filterDateStart');
const filterDateEnd = document.getElementById('filterDateEnd');
const clearFilters = document.getElementById('clearFilters');

// Elementos del DOM - Motorista
const motoristaScreen = document.getElementById('motoristaScreen');
const logoutBtnMotorista = document.getElementById('logoutBtnMotorista');
const motoristaUsername = document.getElementById('motoristaUsername');
const motoristaTasksList = document.getElementById('motoristaTasksList');
const filterStatus = document.getElementById('filterStatus');
const statTodo = document.getElementById('statTodo');
const statProgress = document.getElementById('statProgress');
const statDone = document.getElementById('statDone');

// Elementos del DOM - Modal
const finishModal = document.getElementById('finishModal');
const modalTaskName = document.getElementById('modalTaskName');
const finishTaskForm = document.getElementById('finishTaskForm');
const taskComment = document.getElementById('taskComment');
const closeModalBtn = document.querySelector('.close-modal');
const cancelModalBtn = document.querySelector('.cancel-modal');

const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

// Establecer fecha mínima como hoy
document.getElementById('taskDate').min = new Date().toISOString().split('T')[0];

// Lista de motoristas válidos
const MOTORISTAS = {
    'Juan Pérez': '1234',
    'a': '1',
    'María González': '1234',
    'Carlos Rodríguez': '1234',
    'Ana Martínez': '1234',
    'Luis Hernández': '1234'
};

function showConfirm(message) {
    return new Promise((resolve) => {
        confirmMessage.textContent = message;
        confirmModal.style.display = 'flex';

        function cleanUp() {
            confirmModal.style.display = 'none';
            confirmYes.removeEventListener('click', yesHandler);
            confirmNo.removeEventListener('click', noHandler);
        }

        function yesHandler() {
            cleanUp();
            resolve(true);
        }

        function noHandler() {
            cleanUp();
            resolve(false);
        }

        confirmYes.addEventListener('click', yesHandler);
        confirmNo.addEventListener('click', noHandler);
    });
}

// ==================== HELPERS PARA BACKEND ====================
async function fetchTasksFromServer() {
    try {
        const res = await fetch(`${API_BASE}/tasks`);
        if (!res.ok) throw new Error('Error al obtener tareas');
        const data = await res.json();
        tasks = data.map(t => ({ ...t, id: Number(t.id) }));
    } catch (err) {
        console.error(err);
        tasks = [];
    }
}

async function addTaskToServer(task) {
    try {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        if (!res.ok) throw new Error('Error guardando tarea');
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function updateTaskOnServer(id, patch) {
    try {
        const res = await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
        });
        if (!res.ok) throw new Error('Error actualizando tarea');
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

// ==================== LOGIN ====================
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    // Credenciales de administrador
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = '2';

    // Validación de administrador
    if (role === 'admin') {
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            currentUser = { username, role: 'admin' };
            localStorage.setItem("currentUser", JSON.stringify(currentUser)); // ← guardar
            showScreen('admin');
            adminUsername.textContent = username;
            loginForm.reset();
            hideMessage(loginError);
            fetchTasksFromServer().then(renderAdminTasks);
        }  else {
            showMessage(loginError, 'Usuario o contraseña incorrectos para Administrador', 'error');
        }
    } 
    // Validación de motorista
    else if (role === 'motorista') {
        if (MOTORISTAS[username] && MOTORISTAS[username] === password) {
            currentUser = {
                username: username,
                role: 'motorista'
            };
            localStorage.setItem("currentUser", JSON.stringify(currentUser));

            showScreen('motorista');
            motoristaUsername.textContent = username;
            loginForm.reset();
            hideMessage(loginError);
            fetchTasksFromServer().then(renderMotoristaTasks);
        } else {
            showMessage(loginError, 'Usuario o contraseña incorrectos para Motorista', 'error');
        }
    } 
    // Si no seleccionó rol
    else {
        showMessage(loginError, 'Por favor seleccione un rol', 'error');
    }
});

// ==================== LOGOUT ====================
logoutBtnAdmin.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem("currentUser"); // ← importante
    showScreen('login');
    loginForm.reset();
});

logoutBtnMotorista.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem("currentUser"); // ← importante
    showScreen('login');
    loginForm.reset();
});

// ==================== ADMINISTRADOR - ASIGNACIÓN DE TAREAS ====================
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const confirmed = await showConfirm("¿Está seguro de ingresar esta tarea?");
    if (!confirmed) return;

    const taskName = document.getElementById('taskName').value.trim();
    const motorista = document.getElementById('motorista').value;
    const taskDate = document.getElementById('taskDate').value;
    const taskDescription = document.getElementById('taskDescription').value.trim();

    // Validar campos obligatorios
    if (!taskName || !motorista || !taskDate || !taskDescription) {
        showMessage(formMessage, 'Por favor complete todos los campos obligatorios', 'error');
        return;
    }

    // Crear nueva tarea
    const newTask = {
        id: Date.now(),
        name: taskName,
        motorista: motorista,
        date: taskDate,
        description: taskDescription,
        status: 'Por hacer',
        createdBy: currentUser ? currentUser.username : 'system',
        createdAt: new Date().toISOString(),
        comment: null
    };

    // Guardar en server
    const ok = await addTaskToServer(newTask);
    if (!ok) {
        showMessage(formMessage, 'Error guardando tarea en el servidor', 'error');
        return;
    }

    // Mostrar mensaje de éxito
    showMessage(formMessage, `✓ Tarea asignada exitosamente a ${motorista}`, 'success');

    // Limpiar formulario
    taskForm.reset();

    // Actualizar lista de tareas (recargamos desde servidor)
    await fetchTasksFromServer();
    renderAdminTasks();

    // Ocultar mensaje después de 3 segundos
    setTimeout(() => {
        hideMessage(formMessage);
    }, 3000);
});

// Filtrar tareas (Admin)
filterMotorista.addEventListener('change', () => {
    renderAdminTasks();
});

// === NUEVOS FILTROS POR FECHA ===
filterDateStart.addEventListener('change', renderAdminTasks);
filterDateEnd.addEventListener('change', renderAdminTasks);

// Botón para limpiar todos los filtros
clearFilters.addEventListener('click', () => {
    filterMotorista.value = "";
    filterDateStart.value = "";
    filterDateEnd.value = "";
    renderAdminTasks();
});

// ==================== ADMINISTRADOR - RENDERIZAR TAREAS ====================
function renderAdminTasks() {
    if (!currentUser || currentUser.role !== 'admin') {
        // Solo retornamos si no hay usuario, no redirigimos
        return;
    }
    const motoristaFilter = filterMotorista.value;
    const startDate = filterDateStart.value;
    const endDate = filterDateEnd.value;

    let filteredTasks = [...tasks];

    // Filtrar por motorista
    if (motoristaFilter) {
        filteredTasks = filteredTasks.filter(task => task.motorista === motoristaFilter);
    }

    // Filtrar por fecha inicial
    if (startDate) {
        filteredTasks = filteredTasks.filter(task => task.date >= startDate);
    }

    // Filtrar por fecha final
    if (endDate) {
        filteredTasks = filteredTasks.filter(task => task.date <= endDate);
    }

    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '<p class="empty-state">No hay tareas con los filtros aplicados</p>';
        return;
    }

    tasksList.innerHTML = filteredTasks
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(task => `
            <div class="task-item">
                <div class="task-header">
                    <div class="task-title">${task.name}</div>
                    <span class="task-status ${getStatusClass(task.status)}">${task.status}</span>
                </div>
                <div class="task-info">
                    <div class="task-info-item">
                        <strong>👤 Motorista:</strong> ${task.motorista}
                    </div>
                    <div class="task-info-item">
                        <strong>📅 Fecha:</strong> ${formatDate(task.date)}
                    </div>
                    <div class="task-info-item">
                        <strong>👨‍💼 Asignado por:</strong> ${task.createdBy}
                    </div>
                </div>
                <div class="task-description">
                    <strong>📝 Descripción:</strong>
                    <p>${task.description}</p>
                </div>
                ${task.comment ? `
                    <div class="task-comment">
                        <strong>💬 Comentario del motorista:</strong>
                        <p>${task.comment}</p>
                    </div>
                ` : ''}
            </div>
        `).join('');
}

// ==================== MOTORISTA - RENDERIZAR TAREAS ====================
function renderMotoristaTasks() {
    if (!currentUser || currentUser.role !== 'motorista') {
        return;
    }
    const filter = filterStatus.value;
    const myTasks = tasks.filter(task => task.motorista === currentUser.username);

    const filteredTasks = filter 
        ? myTasks.filter(task => task.status === filter)
        : myTasks;

    // Actualizar estadísticas
    updateStats(myTasks);

    if (filteredTasks.length === 0) {
        motoristaTasksList.innerHTML = '<p class="empty-state">No tienes tareas en esta categoría</p>';
        return;
    }

    motoristaTasksList.innerHTML = filteredTasks
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(task => `
            <div class="task-item">
                <div class="task-header">
                    <div class="task-title">${task.name}</div>
                    <span class="task-status ${getStatusClass(task.status)}">${task.status}</span>
                </div>
                <div class="task-info">
                    <div class="task-info-item">
                        <strong>📅 Fecha:</strong> ${formatDate(task.date)}
                    </div>
                    <div class="task-info-item">
                        <strong>👨‍💼 Asignado por:</strong> ${task.createdBy}
                    </div>
                </div>
                <div class="task-description">
                    <strong>📝 Descripción:</strong>
                    <p>${task.description}</p>
                </div>
                ${task.comment ? `
                    <div class="task-comment">
                        <strong>💬 Tu comentario:</strong>
                        <p>${task.comment}</p>
                    </div>
                ` : ''}
                <div class="task-actions">
                    ${task.status === 'Por hacer' ? `
                        <button class="btn btn-warning btn-small" onclick="changeStatus(${task.id}, 'En proceso')">
                            ⚙️ Iniciar Tarea
                        </button>
                    ` : ''}
                    ${task.status === 'En proceso' ? `
                        <button class="btn btn-success btn-small" onclick="openFinishModal(${task.id})">
                            ✅ Finalizar Tarea
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
}

// Filtrar tareas (Motorista)
filterStatus.addEventListener('change', () => {
    renderMotoristaTasks();
});

// ==================== MOTORISTA - CAMBIAR ESTADO ====================
async function changeStatus(taskId, newStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return; // evita errores
    
    const confirmed = await showConfirm("¿Está seguro de cambiar el estado a en proceso?");
    if (!confirmed) return;


    task.status = newStatus;
    const ok = await updateTaskOnServer(taskId, { status: newStatus });
    if (ok) {
        // actualizar solo la vista, sin recargar todo
        renderMotoristaTasks();
        renderAdminTasks();
    }
}


// ==================== MOTORISTA - MODAL FINALIZAR TAREA ====================
function openFinishModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        currentTaskId = taskId;
        modalTaskName.textContent = task.name;
        taskComment.value = '';
        finishModal.classList.add('active');
    }
}

function closeFinishModal() {
    finishModal.classList.remove('active');
    currentTaskId = null;
    taskComment.value = '';
}

// Cerrar modal con X
closeModalBtn.addEventListener('click', closeFinishModal);

// Cerrar modal con botón cancelar
cancelModalBtn.addEventListener('click', closeFinishModal);

// Cerrar modal al hacer clic fuera
window.addEventListener('click', (e) => {
    if (e.target === finishModal) {
        closeFinishModal();
    }
});

// ==================== MOTORISTA - FINALIZAR TAREA ====================
finishTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const confirmed = await showConfirm("¿Está seguro que quiere pasar la tarea a finalizado?");
    if (!confirmed) return;

    const comment = taskComment.value.trim();
    if (!comment) return alert('Por favor ingresa un comentario');

    const task = tasks.find(t => t.id === currentTaskId);
    if (!task) return;

    task.status = 'Finalizada';
    task.comment = comment;
    task.finishDate = new Date().toISOString().split("T")[0];

    const ok = await updateTaskOnServer(currentTaskId, { 
        status: 'Finalizada', 
        comment,
        finishDate: task.finishDate
    });

    if (ok) {
        renderMotoristaTasks();
        renderAdminTasks();
        closeFinishModal();
    }
});

// ==================== ACTUALIZAR ESTADÍSTICAS ====================
function updateStats(myTasks) {
    const todo = myTasks.filter(t => t.status === 'Por hacer').length;
    const progress = myTasks.filter(t => t.status === 'En proceso').length;
    const done = myTasks.filter(t => t.status === 'Finalizada').length;

    statTodo.textContent = todo;
    statProgress.textContent = progress;
    statDone.textContent = done;
}

// ==================== FUNCIONES AUXILIARES ====================
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (screen === 'admin') {
        adminScreen.classList.add('active');
        renderAdminTasks();
    } else if (screen === 'motorista') {
        motoristaScreen.classList.add('active');
        renderMotoristaTasks();
    } else {
        loginScreen.classList.add('active');
    }
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = type === 'error' ? 'error-message show' : 'success-message show';
}

/*function hideMessage(element) {
    element.classList.remove('show');
}*/

function getStatusClass(status) {
    switch(status) {
        case 'Por hacer': return 'status-todo';
        case 'En proceso': return 'status-progress';
        case 'Finalizada': return 'status-done';
        default: return 'status-todo';
    }
}

function formatDate(dateString) {
    // Evita problemas de zona horaria: construimos la fecha en local
    const [year, month, day] = dateString.split("-");
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        if (currentUser.role === 'admin') {
            loginScreen.classList.remove('active');
            adminScreen.classList.add('active');
            adminUsername.textContent = currentUser.username;
            await fetchTasksFromServer();
            renderAdminTasks();
        } else if (currentUser.role === 'motorista') {
            loginScreen.classList.remove('active');
            motoristaScreen.classList.add('active');
            motoristaUsername.textContent = currentUser.username;
            await fetchTasksFromServer();
            renderMotoristaTasks();
        }
    } else {
        loginScreen.classList.add('active');
    }
});
