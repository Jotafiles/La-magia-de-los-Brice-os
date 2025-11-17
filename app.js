// ============================================
// APLICACIÓN: NAVIDAD RANDOM
// Sistema de Sorteo Familiar Navideño
// ============================================

// Estado global de la aplicación
const AppState = {
    currentUser: null,
    currentScreen: 'loginScreen',
    participants: [],
    notifications: [],
    drawResult: null,
    isAdmin: false
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎄 Navidad Random iniciada');
    
    // Verificar que Supabase esté configurado
    if (!supabase) {
        console.error('❌ Supabase no está configurado');
        showToast('❌ Error de configuración. Verifica supabase-config.js');
        return;
    }
    
    // Cargar tema guardado
    loadSavedTheme();
    
    // Inicializar efectos visuales
    createSnowEffect();
    
    // Verificar sesión existente
    checkExistingSession();
    
    // Registrar event listeners
    registerEventListeners();
    
    // NO cargar notificaciones aquí para evitar doble carga
    // Se cargarán cuando el usuario navegue a la pantalla de notificaciones
    
    // Iniciar countdown
    startChristmasCountdown();
});

// ============================================
// GESTIÓN DE SESIÓN
// ============================================

async function checkExistingSession() {
    const savedUser = localStorage.getItem('navidadRandomUser');
    
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            
            // Verificar si el usuario todavía existe en la base de datos
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();
            
            // Solo cerrar sesión si el usuario fue eliminado (error PGRST116)
            // No cerrar sesión por errores de red u otros problemas temporales
            if (error && error.code === 'PGRST116') {
                // Usuario no existe en la base de datos
                console.log('Usuario eliminado de la base de datos');
                forceLogout('Tu cuenta ha sido eliminada');
                return;
            }
            
            if (error) {
                // Error de conexión u otro problema - mantener sesión local
                console.warn('Error al verificar usuario, usando datos locales:', error);
                AppState.currentUser = user;
                AppState.isAdmin = user.role === 'admin';
                navigateToHome();
                startUserVerification();
                return;
            }
            
            // Usuario existe, continuar con la sesión
            AppState.currentUser = data;
            AppState.isAdmin = data.role === 'admin';
            
            // Actualizar localStorage con datos frescos
            localStorage.setItem('navidadRandomUser', JSON.stringify(data));
            
            navigateToHome();
            
            // Iniciar verificación periódica
            startUserVerification();
            
        } catch (error) {
            console.error('Error al cargar sesión:', error);
            // Solo eliminar sesión si es un error de parsing, no de red
            if (error instanceof SyntaxError) {
                localStorage.removeItem('navidadRandomUser');
            }
        }
    }
}

// Verificación periódica del usuario
let verificationInterval = null;

function startUserVerification() {
    // Limpiar intervalo anterior si existe
    if (verificationInterval) {
        clearInterval(verificationInterval);
    }
    
    // Verificar cada 30 segundos si el usuario todavía existe
    verificationInterval = setInterval(async () => {
        if (!AppState.currentUser) {
            clearInterval(verificationInterval);
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id')
                .eq('id', AppState.currentUser.id)
                .single();
            
            // Solo cerrar sesión si el usuario fue eliminado (error PGRST116)
            if (error && error.code === 'PGRST116') {
                // Usuario fue eliminado
                clearInterval(verificationInterval);
                forceLogout('Tu cuenta ha sido eliminada de la base de datos');
            }
            // Si hay otros errores (red, timeout), no hacer nada y mantener sesión
        } catch (error) {
            console.error('Error al verificar usuario:', error);
            // No cerrar sesión por errores de red
        }
    }, 30000); // Verificar cada 30 segundos
}

function forceLogout(message = 'Sesión cerrada') {
    // Limpiar intervalo de verificación
    if (verificationInterval) {
        clearInterval(verificationInterval);
        verificationInterval = null;
    }
    
    // Limpiar todo
    localStorage.removeItem('navidadRandomUser');
    localStorage.removeItem('navidadRandomSavedResult');
    AppState.currentUser = null;
    AppState.isAdmin = false;
    AppState.drawResult = null;
    
    // Volver al login
    showScreen('loginScreen');
    showToast('⚠️ ' + message);
}

async function login(email, password) {
    try {
        showToast('Iniciando sesión...');
        
        // Buscar usuario en Supabase
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error) throw new Error('Usuario no encontrado');
        
        // Verificar contraseña
        const isValid = await window.supabaseConfig.verifyPassword(password, users.password_hash);
        
        if (!isValid) {
            throw new Error('Contraseña incorrecta');
        }
        
        // Guardar sesión
        AppState.currentUser = users;
        AppState.isAdmin = users.role === 'admin';
        localStorage.setItem('navidadRandomUser', JSON.stringify(users));
        
        showToast('¡Bienvenido, ' + users.name + '! 🎄');
        navigateToHome();
        
        // Iniciar verificación periódica
        startUserVerification();
        
        // Enviar notificación de conexión
        await createNotification('info', 'Nueva conexión', `${users.name} se ha conectado`, '👋');
        
    } catch (error) {
        showToast('❌ ' + error.message);
        console.error('Error en login:', error);
    }
}

async function register(name, email, password) {
    try {
        showToast('Registrando usuario...');
        
        // Validar datos
        if (!name || !email || !password) {
            throw new Error('Todos los campos son requeridos');
        }
        
        if (password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        
        // Hash de contraseña
        const passwordHash = await window.supabaseConfig.hashPassword(password);
        
        // Seleccionar avatar aleatorio
        const avatars = ['🎅', '🤶', '🧑‍🎄', '⛄', '🦌', '🎄', '🎁', '⭐', '🔔', '🕯️'];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
        
        // Crear usuario en Supabase
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    email: email,
                    name: name,
                    password_hash: passwordHash,
                    role: 'participant',
                    avatar: randomAvatar
                }
            ])
            .select()
            .single();
        
        if (error) {
            if (error.code === '23505') {
                throw new Error('Este correo ya está registrado');
            }
            throw error;
        }
        
        // Guardar sesión del nuevo usuario
        AppState.currentUser = data;
        AppState.isAdmin = data.role === 'admin';
        localStorage.setItem('navidadRandomUser', JSON.stringify(data));
        
        // Marcar que debe ver la pantalla de bienvenida
        localStorage.setItem('showWelcomeScreen', 'true');
        
        showToast('✅ ¡Registro exitoso! Bienvenido a la familia 🎄');
        
        // Mostrar pantalla de bienvenida
        showWelcomeScreen();
        
    } catch (error) {
        showToast('❌ ' + error.message);
        console.error('Error en registro:', error);
    }
}

function logout() {
    if (confirm('¿Seguro que quieres cerrar sesión? 🎅')) {
        // Limpiar intervalo de verificación
        if (verificationInterval) {
            clearInterval(verificationInterval);
            verificationInterval = null;
        }
        
        localStorage.removeItem('navidadRandomUser');
        localStorage.removeItem('navidadRandomSavedResult');
        AppState.currentUser = null;
        AppState.isAdmin = false;
        AppState.drawResult = null;
        showScreen('loginScreen');
        showToast('👋 Hasta luego, nos vemos en Navidad!');
    }
}

function showWelcomeScreen() {
    // Crear pantalla de bienvenida
    const welcomeScreen = document.createElement('div');
    welcomeScreen.id = 'welcomeModal';
    welcomeScreen.className = 'welcome-modal';
    welcomeScreen.innerHTML = `
        <div class="welcome-overlay"></div>
        <div class="welcome-content">
            <div class="welcome-sleigh-animation">
                <div class="sleigh">🛷</div>
                <div class="santa">🎅</div>
            </div>
            <h1 class="welcome-message-title">¡Bienvenido a la Familia Navideña! 🎄</h1>
            <p class="welcome-message-text">
                ¡Hola ${AppState.currentUser.name}! 🎉<br><br>
                Te has unido a la magia de <strong>La Familia Briceño</strong>. 
                Pronto se realizará el sorteo y descubrirás a quién le toca regalar esta Navidad.<br><br>
                Prepárate para vivir momentos inolvidables llenos de sorpresas y alegría. 
                ¡La magia de regalar comienza aquí! ✨🎁
            </p>
            <button class="btn-welcome" id="closeWelcomeBtn">
                <span>🎄 ¡Entendido, vamos!</span>
            </button>
        </div>
    `;
    
    document.body.appendChild(welcomeScreen);
    
    // Agregar event listener al botón
    document.getElementById('closeWelcomeBtn').addEventListener('click', () => {
        welcomeScreen.classList.add('fade-out');
        setTimeout(() => {
            welcomeScreen.remove();
            // Navegar al home después de cerrar
            navigateToHome();
        }, 500);
    });
    
    // Mostrar con animación
    setTimeout(() => {
        welcomeScreen.classList.add('show');
    }, 100);
}

// ============================================
// NAVEGACIÓN
// ============================================

function showScreen(screenId) {
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar pantalla solicitada
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        AppState.currentScreen = screenId;
        
        // Actualizar navegación
        updateNavigation(screenId);
    }
}

function updateNavigation(screenId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        
        if (item.dataset.screen === screenId) {
            item.classList.add('active');
        }
    });
}

function navigateToHome() {
    showScreen('homeScreen');
    document.getElementById('bottomNav').classList.remove('hidden');
    document.getElementById('userName').textContent = AppState.currentUser.name;
    
    // Mostrar indicador de admin
    if (AppState.isAdmin) {
        document.getElementById('userName').innerHTML += ' <span style="background: linear-gradient(135deg, #6A1B9A, #8E24AA); color: white; padding: 2px 8px; border-radius: 8px; font-size: 12px; margin-left: 8px;">👑 ADMIN</span>';
    }
    
    // Cargar datos
    loadParticipants();
    loadUserDrawResult().then(() => {
        // Mostrar resultado guardado si existe
        displaySavedResult();
        
        // Agregar animación y badge al botón de regalo si el usuario no ha revelado
        if (AppState.drawResult && !AppState.drawResult.revealed_at) {
            addGiftNotificationBadge();
        }
    });
    updateProfileInfo();
    updateAdminUI();
    loadAdminMessage(); // Cargar mensaje especial del admin
}

// ============================================
// SORTEO (DRAW)
// ============================================

async function performDraw() {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede ejecutar el sorteo');
        return;
    }
    
    try {
        showToast('🎲 Ejecutando sorteo...');
        
        // Obtener todos los participantes
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');
        
        if (usersError) throw usersError;
        
        if (users.length < 2) {
            throw new Error('Se necesitan al menos 2 participantes');
        }
        
        // Algoritmo de sorteo: cada persona regala a otra (sin repetirse)
        const shuffled = [...users];
        let valid = false;
        let attempts = 0;
        let assignments = [];
        
        while (!valid && attempts < 100) {
            // Mezclar array
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            // Verificar que nadie se regale a sí mismo
            valid = true;
            assignments = [];
            
            for (let i = 0; i < users.length; i++) {
                if (users[i].id === shuffled[i].id) {
                    valid = false;
                    break;
                }
                assignments.push({
                    giver_id: users[i].id,
                    receiver_id: shuffled[i].id
                });
            }
            
            attempts++;
        }
        
        if (!valid) {
            throw new Error('No se pudo generar un sorteo válido');
        }
        
        // Borrar sorteos anteriores
        await supabase.from('draw_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Limpiar localStorage de resultados guardados
        localStorage.removeItem('navidadRandomSavedResult');
        
        // Guardar resultados en la base de datos
        const { error: insertError } = await supabase
            .from('draw_results')
            .insert(assignments);
        
        if (insertError) throw insertError;
        
        showToast('✅ ¡Sorteo realizado con éxito!');
        
        // Mostrar notificación flotante visible
        showFloatingNotification('¡El sorteo ha sido realizado! 🎉 Descubre a quién le toca regalar', '🎁');
        
        // Enviar notificación global
        await createNotification('success', '🎉 ¡Sorteo Realizado!', 'El sorteo ha sido ejecutado. ¡Descubre a quién le toca regalar!', '🎁');
        
        // Recargar datos del usuario y actualizar la vista
        await loadUserDrawResult();
        displaySavedResult();
        
        // Agregar animación y badge al botón de regalo si el usuario no ha revelado
        if (AppState.drawResult && !AppState.drawResult.revealed_at) {
            addGiftNotificationBadge();
        }
        
        loadParticipants();
        
    } catch (error) {
        showToast('❌ Error en el sorteo: ' + error.message);
        console.error('Error en sorteo:', error);
    }
}

async function loadUserDrawResult() {
    if (!AppState.currentUser) return;
    
    try {
        // Primero obtener el resultado del sorteo
        const { data, error } = await supabase
            .from('draw_results')
            .select('*')
            .eq('giver_id', AppState.currentUser.id)
            .single();
        
        if (error) {
            // No hay resultado aún
            AppState.drawResult = null;
            return;
        }
        
        AppState.drawResult = data;
        
        // Obtener datos del receptor por separado
        if (data && data.receiver_id) {
            const { data: receiver, error: receiverError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.receiver_id)
                .single();
            
            if (!receiverError && receiver) {
                AppState.drawResult.receiver = receiver;
            }
        }
        
    } catch (error) {
        console.error('Error al cargar resultado:', error);
    }
}

async function revealGift() {
    // Quitar el badge de notificación al abrir el regalo
    removeGiftNotificationBadge();
    
    showScreen('giftScreen');
    
    // Mostrar estado de carga
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('revealState').classList.add('hidden');
    
    // Esperar 3 segundos para efecto dramático
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await loadUserDrawResult();
    
    if (!AppState.drawResult) {
        showToast('⏳ El sorteo aún no se ha realizado');
        showScreen('homeScreen');
        return;
    }
    
    // Ocultar loading, mostrar resultado
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('revealState').classList.remove('hidden');
    
    // Llenar datos
    const receiver = AppState.drawResult.receiver;
    document.getElementById('recipientName').textContent = receiver.name;
    document.querySelector('.recipient-avatar').textContent = receiver.avatar;
    
    // Mensaje gracioso aleatorio
    const funnyMessages = [
        `¡Prepárate para envolverle los calcetines a ${receiver.name}!`,
        `Te toca mimar a ${receiver.name} esta Navidad 🎁`,
        `${receiver.name} será muy feliz con tu regalo 😊`,
        `Hora de sorprender a ${receiver.name} con algo especial`,
        `¡${receiver.name} espera ansiosamente tu regalo!`,
        `Tienes la misión de alegrarle la Navidad a ${receiver.name}`,
        `${receiver.name} no sabe la sorpresa que le espera 🎉`
    ];
    
    const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
    document.getElementById('funnyMessage').textContent = randomMessage;
    
    // Hora de revelación
    const now = new Date();
    document.getElementById('revealTime').textContent = now.toLocaleString('es-CL', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Santiago'
    });
    
    // Efecto de confeti
    createConfetti();
    
    // Actualizar revealed_at si no existe
    if (!AppState.drawResult.revealed_at) {
        await supabase
            .from('draw_results')
            .update({ revealed_at: now.toISOString() })
            .eq('id', AppState.drawResult.id);
        
        // Actualizar el estado local
        AppState.drawResult.revealed_at = now.toISOString();
    }
    
    // Guardar en localStorage para acceso rápido
    saveSavedResult();
    
    // Actualizar la vista del inicio para mostrar el resultado
    displaySavedResult();
}

function displaySavedResult() {
    const savedResultCard = document.getElementById('savedResultCard');
    const mainActionCard = document.getElementById('mainActionCard');
    
    // Verificar si existe resultado y si ya fue revelado
    if (AppState.drawResult && AppState.drawResult.revealed_at) {
        const receiver = AppState.drawResult.receiver;
        
        // Llenar datos ANTES de mostrar para evitar layout shift
        document.getElementById('savedAvatar').textContent = receiver.avatar;
        document.getElementById('savedName').textContent = receiver.name;
        
        // Mensaje aleatorio
        const savedMessages = [
            `¡No olvides preparar tu regalo! 🎄`,
            `¡Recuerda comprar algo especial! 🎁`,
            `Tu misión navideña te espera 🎅`,
            `¡Prepara la sorpresa perfecta! ⭐`,
            `El mejor regalo viene del corazón ❤️`
        ];
        const randomMsg = savedMessages[Math.floor(Math.random() * savedMessages.length)];
        document.getElementById('savedMessage').textContent = randomMsg;
        
        // Fecha de revelación
        const revealDate = new Date(AppState.drawResult.revealed_at);
        document.getElementById('savedDate').textContent = revealDate.toLocaleString('es-CL', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Santiago'
        });
        
        // Guardar en localStorage
        saveSavedResult();
        
        // Ocultar botón de "Abrir Regalo"
        mainActionCard.style.display = 'none';
        
        // Mostrar tarjeta guardada DESPUÉS de llenar los datos
        requestAnimationFrame(() => {
            savedResultCard.classList.remove('hidden');
        });
        
    } else {
        // No hay resultado o no se ha revelado aún
        savedResultCard.classList.add('hidden');
        mainActionCard.style.display = 'block';
    }
}

function saveSavedResult() {
    if (AppState.drawResult && AppState.drawResult.receiver) {
        const savedData = {
            receiverName: AppState.drawResult.receiver.name,
            receiverAvatar: AppState.drawResult.receiver.avatar,
            revealedAt: AppState.drawResult.revealed_at,
            userId: AppState.currentUser.id
        };
        localStorage.setItem('navidadRandomSavedResult', JSON.stringify(savedData));
    }
}

function loadSavedResultFromStorage() {
    const saved = localStorage.getItem('navidadRandomSavedResult');
    if (saved && AppState.currentUser) {
        try {
            const data = JSON.parse(saved);
            // Verificar que sea del usuario actual
            if (data.userId === AppState.currentUser.id) {
                return data;
            }
        } catch (error) {
            console.error('Error al cargar resultado guardado:', error);
        }
    }
    return null;
}

// ============================================
// PARTICIPANTES
// ============================================

async function loadParticipants() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error de Supabase:', error);
            // Si es error de tabla no encontrada, mostrar mensaje más útil
            if (error.code === '42P01') {
                showToast('⚠️ La tabla "users" no existe. Ejecuta setup_supabase.sql');
                const container = document.getElementById('familyTreeContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="loading-participants">
                            <div class="empty-icon">⚠️</div>
                            <p>Tablas no encontradas</p>
                            <span style="font-size: 12px; color: var(--color-text-light);">
                                Ve a Supabase > SQL Editor<br>
                                Ejecuta el archivo setup_supabase.sql
                            </span>
                        </div>
                    `;
                }
                return;
            }
            throw error;
        }
        
        // Manejar caso cuando data es null o undefined
        const participants = data || [];
        AppState.participants = participants;
        
        // NO llamar a displayParticipants porque usa el árbol familiar ahora
        // El árbol se maneja con loadFamilyTree()
        
        // Actualizar contador en perfil si el elemento existe
        const statElement = document.getElementById('statParticipants');
        if (statElement) {
            statElement.textContent = participants.length;
        }
        
    } catch (error) {
        console.error('Error al cargar participantes:', error);
        
        // Determinar el mensaje según el tipo de error
        let errorMessage = '⚠️ Error desconocido. Abre la consola (F12) para más detalles';
        
        if (error.message && error.message.includes('Failed to fetch')) {
            errorMessage = '⚠️ Error de conexión. Verifica tu internet o las credenciales de Supabase';
        } else if (error.message && error.message.includes('relation')) {
            errorMessage = '⚠️ La tabla "users" no existe. Ejecuta setup_supabase.sql';
        }
        
        showToast(errorMessage);
        
        // Mostrar mensaje en el contenedor
        const container = document.getElementById('familyTreeContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-participants">
                    <div class="empty-icon">⚠️</div>
                    <p>Error al cargar datos</p>
                    <span style="font-size: 12px; color: var(--color-text-light);">
                        ${error.message || 'Error desconocido'}<br><br>
                        <strong>¿Qué hacer?</strong><br>
                        1. Ve a Supabase > SQL Editor<br>
                        2. Ejecuta setup_supabase.sql<br>
                        3. Recarga esta página
                    </span>
                </div>
            `;
        }
    }
}

function displayParticipants(participants) {
    const container = document.getElementById('participantsList');
    
    if (participants.length === 0) {
        container.innerHTML = `
            <div class="loading-participants">
                <div class="empty-icon">🎄</div>
                <p>Aún no hay participantes</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = participants.map(user => `
        <div class="participant-item">
            <div class="participant-avatar">${user.avatar}</div>
            <div class="participant-info">
                <div class="participant-name">${user.name}</div>
                <div class="participant-email">${user.email}</div>
            </div>
        </div>
    `).join('');
    
    // Mostrar botón de sorteo si es admin
    if (AppState.isAdmin) {
        document.getElementById('adminDrawBtn').classList.remove('hidden');
    }
}

// ============================================
// NOTIFICACIONES
// ============================================

async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        AppState.notifications = data;
        displayNotifications(data);
        
        // Actualizar badge
        const badge = document.getElementById('notificationBadge');
        if (data.length > 0) {
            badge.textContent = data.length;
            badge.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-notifications">
                <div class="empty-icon">🎄</div>
                <p>No hay notificaciones aún</p>
                <span>Te avisaremos cuando haya novedades</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notif => {
        const date = new Date(notif.created_at);
        const timeAgo = getTimeAgo(date);
        
        return `
            <div class="notification-item ${notif.type}">
                <div class="notification-header">
                    <span class="notification-icon">${notif.icon}</span>
                    <span class="notification-title">${notif.title}</span>
                </div>
                <div class="notification-message">${notif.message}</div>
                <div class="notification-time">${timeAgo}</div>
            </div>
        `;
    }).join('');
}

async function createNotification(type, title, message, icon = '🔔') {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert([{ type, title, message, icon }]);
        
        if (error) throw error;
        
        // Recargar notificaciones
        loadNotifications();
        
    } catch (error) {
        console.error('Error al crear notificación:', error);
    }
}

function showFloatingNotification(message, icon = '🎄') {
    const notification = document.getElementById('notification');
    notification.innerHTML = `
        <span style="font-size: 24px;">${icon}</span>
        <span>${message}</span>
    `;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 4000);
}

// ============================================
// PERFIL
// ============================================

function updateProfileInfo() {
    if (!AppState.currentUser) return;
    
    const profileName = document.getElementById('profileName');
    profileName.textContent = AppState.currentUser.name;
    
    // Agregar badge de admin en perfil
    if (AppState.isAdmin) {
        profileName.innerHTML += ' <span style="color: #6A1B9A; font-size: 14px;">👑</span>';
    }
    
    document.getElementById('profileEmail').textContent = AppState.currentUser.email;
    document.querySelector('.profile-avatar').textContent = AppState.currentUser.avatar;
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('navidadRandomTheme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('navidadRandomTheme', isDark ? 'dark' : 'light');
    showToast(isDark ? '🌙 Modo oscuro activado' : '☀️ Modo claro activado');
}

// ============================================
// EFECTOS VISUALES
// ============================================

function createSnowEffect() {
    const container = document.getElementById('snowContainer');
    const snowflakes = ['❄', '❅', '❆'];
    
    // Detectar si es móvil
    const isMobile = window.innerWidth <= 768;
    const snowflakeCount = isMobile ? 20 : 50; // Menos copos en móvil para mejor rendimiento
    
    for (let i = 0; i < snowflakeCount; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.animationDuration = (Math.random() * 10 + 5) + 's';
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        
        // Tamaño más grande en móvil para mejor visibilidad
        const fontSize = isMobile 
            ? (Math.random() * 8 + 14) + 'px'  // 14-22px en móvil
            : (Math.random() * 10 + 10) + 'px'; // 10-20px en desktop
        snowflake.style.fontSize = fontSize;
        
        container.appendChild(snowflake);
    }
}

function createConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#FF0000', '#00FF00', '#FFD700', '#FF69B4', '#00CED1'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(confetti);
    }
    
    // Limpiar después de 4 segundos
    setTimeout(() => {
        container.innerHTML = '';
    }, 4000);
}

// ============================================
// UTILIDADES
// ============================================

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} minutos`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
    return `Hace ${Math.floor(seconds / 86400)} días`;
}

function addGiftNotificationBadge() {
    const giftBox = document.querySelector('.gift-box');
    const mainActionCard = document.getElementById('mainActionCard');
    
    if (!giftBox || !mainActionCard) return;
    
    // Agregar clase de animación más intensa
    giftBox.classList.add('gift-pulse');
    mainActionCard.classList.add('card-highlight');
    
    // Crear badge de notificación si no existe
    let badge = document.getElementById('giftNotificationBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'giftNotificationBadge';
        badge.className = 'gift-notification-badge';
        badge.textContent = '!';
        
        const giftBoxAnimation = document.querySelector('.gift-box-animation');
        if (giftBoxAnimation) {
            giftBoxAnimation.style.position = 'relative';
            giftBoxAnimation.appendChild(badge);
        }
    }
}

function removeGiftNotificationBadge() {
    const giftBox = document.querySelector('.gift-box');
    const mainActionCard = document.getElementById('mainActionCard');
    const badge = document.getElementById('giftNotificationBadge');
    
    if (giftBox) giftBox.classList.remove('gift-pulse');
    if (mainActionCard) mainActionCard.classList.remove('card-highlight');
    if (badge) badge.remove();
}

function startChristmasCountdown() {
    function updateCountdown() {
        const now = new Date();
        const christmas = new Date(now.getFullYear(), 11, 25); // 25 de diciembre
        
        if (now > christmas) {
            christmas.setFullYear(christmas.getFullYear() + 1);
        }
        
        const diff = christmas - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
            countdownEl.textContent = `${days}d ${hours}h ${minutes}m`;
        }
        
        // Actualizar días en perfil
        const statDays = document.getElementById('statDays');
        if (statDays) {
            statDays.textContent = days;
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 60000); // Actualizar cada minuto
}

// ============================================
// FUNCIONES EXCLUSIVAS DE ADMINISTRADOR
// ============================================

function updateAdminUI() {
    // Mostrar/ocultar elementos según rol de admin
    const adminElements = document.querySelectorAll('.admin-only');
    const adminButtons = document.querySelectorAll('.btn-admin');
    
    if (AppState.isAdmin) {
        adminElements.forEach(el => el.classList.remove('hidden'));
        adminButtons.forEach(btn => btn.classList.remove('hidden'));
        
        // Cargar estadísticas de admin si está en la pantalla de perfil
        if (AppState.currentScreen === 'profileScreen') {
            loadAdminStatistics();
        }
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
        adminButtons.forEach(btn => btn.classList.add('hidden'));
    }
}

async function resetDraw() {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede reiniciar el sorteo');
        return;
    }
    
    if (!confirm('⚠️ ¿Estás seguro de reiniciar el sorteo? Esto borrará todas las asignaciones actuales.')) {
        return;
    }
    
    try {
        showToast('🔄 Reiniciando sorteo...');
        
        // Borrar todas las asignaciones
        await supabase
            .from('draw_results')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Limpiar localStorage de resultados guardados
        localStorage.removeItem('navidadRandomSavedResult');
        
        showToast('✅ Sorteo reiniciado con éxito');
        
        // Mostrar notificación flotante visible
        showFloatingNotification('¡El sorteo ha sido reiniciado! 🔄', '🔄');
        
        // Enviar notificación
        await createNotification('warning', 'Sorteo Reiniciado', 'El administrador ha reiniciado el sorteo', '🔄');
        
        // Recargar datos del usuario y actualizar la vista
        await loadUserDrawResult();
        displaySavedResult();
        loadParticipants();
        
    } catch (error) {
        showToast('❌ Error al reiniciar: ' + error.message);
        console.error('Error:', error);
    }
}

async function deleteAllNotifications() {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede borrar notificaciones');
        return;
    }
    
    if (!confirm('⚠️ ¿Borrar todas las notificaciones?')) {
        return;
    }
    
    try {
        await supabase
            .from('notifications')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        showToast('✅ Notificaciones borradas');
        loadNotifications();
        
    } catch (error) {
        showToast('❌ Error: ' + error.message);
    }
}

async function loadAdminStatistics() {
    if (!AppState.isAdmin) return;
    
    try {
        // Obtener estadísticas
        const { data: users } = await supabase.from('users').select('*');
        const { data: draws } = await supabase.from('draw_results').select('*');
        const { data: revealed } = await supabase.from('draw_results').select('*').not('revealed_at', 'is', null);
        
        // Actualizar UI con estadísticas
        const statsContainer = document.getElementById('adminStats');
        if (statsContainer && users && draws) {
            statsContainer.innerHTML = `
                <div class="admin-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-value">${users.length}</div>
                        <div class="stat-label">Total Usuarios</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🎲</div>
                        <div class="stat-value">${draws?.length || 0}</div>
                        <div class="stat-label">Sorteos Activos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🎁</div>
                        <div class="stat-value">${revealed?.length || 0}</div>
                        <div class="stat-label">Regalos Revelados</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-value">${draws?.length > 0 ? Math.round((revealed?.length || 0) / draws.length * 100) : 0}%</div>
                        <div class="stat-label">Progreso</div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

async function viewDrawResults() {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede ver todos los resultados');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('draw_results')
            .select(`
                *,
                giver:users!draw_results_giver_id_fkey(name, avatar),
                receiver:users!draw_results_receiver_id_fkey(name, avatar)
            `);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            showToast('⚠️ Aún no hay sorteo ejecutado');
            return;
        }
        
        // Mostrar resultados en un alert (podrías crear un modal más elegante)
        let results = '🎁 RESULTADOS DEL SORTEO 🎁\n\n';
        data.forEach(item => {
            const status = item.revealed_at ? '✅' : '⏳';
            results += `${status} ${item.giver.name} → ${item.receiver.name}\n`;
        });
        
        alert(results);
        
    } catch (error) {
        showToast('❌ Error: ' + error.message);
    }
}

// ============================================
// ÁRBOL FAMILIAR
// ============================================

// Mensajes bonitos SÚPER CHILENOS para cada familiar
const chileanMessages = [
    "Erí el más bacán de la familia, te queremos caleta po! 🎄",
    "Erí la luz que ilumina nuestras navidades, compadre querido 🌟", 
    "Con tu sonrisa hací que todo sea más bonito, wena! 😊",
    "Erí el regalo más grande que tenemos, hermano del alma ❤️",
    "Tu alegría es contagiosa po, nos hací felices a todos! 🎉",
    "Erí la estrella que guía nuestra familia navideña, cachai ⭐",
    "Con tu cariño hací que cada día sea especial, weon lindo 💝",
    "Erí el corazón de nuestra familia, te amamos caleta 💖",
    "Tu presencia es el mejor regalo de Navidad, en serio po 🎁",
    "Erí la magia que hace brillar nuestro árbol, oye 🎄✨",
    "Con tu amor hací que todo sea más hermoso, cachai 🌈",
    "Erí la bendición más grande de nuestras vidas, weon 🙏",
    "Tu risa es la melodía más linda de la Navidad po 🎵",
    "Erí el ángel que cuida a toda la familia, en serio 👼",
    "Con tu ternura hací que el mundo sea mejor, oye 🤗",
    "Erí la esperanza que nos une en estas fiestas, cachai 🕯️",
    "Tu bondad es el regalo que nunca se acaba po 💫",
    "Erí la paz que necesitamos en Navidad, weon lindo ☮️",
    "Con tu amor incondicional nos hací sentir especiales 💕",
    "Erí la tradición más hermosa de nuestra familia po 🏠",
    "Tení un corazón de oro, te queremos harto 💛",
    "Erí la alegría de la casa, siempre nos hací reír 😄",
    "Con vos las navidades son más bacanes, cachai 🎅",
    "Erí el alma de la familia, no cambiés nunca po ✨"
];

let familyTreeData = [];
let currentSphereModal = null;

async function loadFamilyTree() {
    try {
        const container = document.getElementById('familyTreeContainer');
        container.innerHTML = `
            <div class="loading-participants">
                <div class="spinning-gift">🎄</div>
                <p>Preparando el árbol...</p>
            </div>
        `;
        
        // Cargar participantes con mensajes
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        // Generar mensajes bonitos si no existen
        const usersWithMessages = await generateNiceMessages(users);
        familyTreeData = usersWithMessages;
        
        // Renderizar el árbol
        renderFamilyTree(usersWithMessages);
        
    } catch (error) {
        console.error('Error al cargar árbol familiar:', error);
        showToast('❌ Error al cargar el árbol familiar');
    }
}

async function generateNiceMessages(users) {
    const usersWithMessages = [];
    
    for (let user of users) {
        // Verificar si ya tiene mensaje guardado en localStorage
        const savedMessages = JSON.parse(localStorage.getItem('familyMessages') || '{}');
        
        let niceMessage = savedMessages[user.id];
        
        if (!niceMessage) {
            // Generar mensaje aleatorio
            niceMessage = chileanMessages[Math.floor(Math.random() * chileanMessages.length)];
            
            // Personalizar con el nombre
            niceMessage = niceMessage.replace(/hermano\/a|compadre|wena/g, user.name);
            
            // Guardar en localStorage
            savedMessages[user.id] = niceMessage;
            localStorage.setItem('familyMessages', JSON.stringify(savedMessages));
        }
        
        usersWithMessages.push({
            ...user,
            nice_message: niceMessage
        });
    }
    
    return usersWithMessages;
}

function renderFamilyTree(users) {
    const container = document.getElementById('familyTreeContainer');
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="loading-participants">
                <div class="empty-icon">🎄</div>
                <p>Aún no hay familia en el árbol</p>
            </div>
        `;
        return;
    }
    
    // Crear el árbol base con estructura CSS
    container.innerHTML = `
        <div class="christmas-tree">
            <div class="tree-layer"></div>
            <div class="tree-layer"></div>
            <div class="tree-layer"></div>
            <div class="tree-layer"></div>
            <div class="tree-star">⭐</div>
        </div>
        <div class="tree-decorations" id="treeDecorations"></div>
    `;
    
    // Agregar efecto de nieve en el árbol
    createTreeSnow();
    
    // Posicionar esferas con sistema anti-colisión
    const decorationsContainer = document.getElementById('treeDecorations');
    const sphereColors = ['sphere-red', 'sphere-green', 'sphere-blue', 'sphere-gold', 'sphere-purple', 'sphere-silver'];
    const usedPositions = []; // Para evitar superposiciones
    
    users.forEach((user, index) => {
        const sphere = document.createElement('div');
        sphere.className = `family-sphere ${sphereColors[index % sphereColors.length]}`;
        sphere.textContent = user.name.length > 8 ? user.name.substring(0, 8) + '...' : user.name;
        sphere.dataset.userId = user.id;
        
        // Generar posición sin colisiones
        let position;
        let attempts = 0;
        do {
            position = generateSpherePosition(index, users.length);
            attempts++;
        } while (hasCollision(position, usedPositions) && attempts < 50);
        
        // Guardar posición usada
        usedPositions.push(position);
        
        sphere.style.left = position.x + '%';
        sphere.style.top = position.y + '%';
        
        // Retraso de animación para efecto escalonado
        sphere.style.animationDelay = (index * 0.5) + 's';
        
        // Event listener para abrir modal
        sphere.addEventListener('click', () => openSphereModal(user));
        
        decorationsContainer.appendChild(sphere);
    });
}

function generateSpherePosition(index, total) {
    // COORDENADAS EXACTAS - Basadas en las capas reales del árbol CSS
    // Cada capa tiene coordenadas precisas para evitar que salgan del verde
    
    const treeLayers = [
        // Capa 1 (superior) - Triángulo más pequeño
        { 
            minY: 30, maxY: 40,  // Zona segura dentro del verde
            minX: 47, maxX: 53   // Centro estrecho
        },
        // Capa 2 (media-superior) - Segundo triángulo
        { 
            minY: 43, maxY: 53, 
            minX: 43, maxX: 57   // Más ancha
        },
        // Capa 3 (media) - Tercer triángulo
        { 
            minY: 58, maxY: 68, 
            minX: 39, maxX: 61   // Aún más ancha
        },
        // Capa 4 (inferior) - Triángulo más grande
        { 
            minY: 73, maxY: 83, 
            minX: 34, maxX: 66   // La más ancha
        }
    ];
    
    // Distribuir esferas equitativamente por capas
    const layerIndex = Math.floor((index / total) * treeLayers.length);
    const layer = treeLayers[Math.min(layerIndex, treeLayers.length - 1)];
    
    // Generar posición dentro de los límites seguros
    const x = layer.minX + Math.random() * (layer.maxX - layer.minX);
    const y = layer.minY + Math.random() * (layer.maxY - layer.minY);
    
    return {
        x: Math.round(x * 10) / 10, // Redondear para precisión
        y: Math.round(y * 10) / 10
    };
}

// Función para detectar colisiones entre esferas
function hasCollision(newPosition, usedPositions) {
    const minDistance = 8; // Distancia mínima entre esferas (en porcentaje)
    
    for (let usedPos of usedPositions) {
        const distance = Math.sqrt(
            Math.pow(newPosition.x - usedPos.x, 2) + 
            Math.pow(newPosition.y - usedPos.y, 2)
        );
        
        if (distance < minDistance) {
            return true; // Hay colisión
        }
    }
    
    return false; // No hay colisión
}

function createTreeSnow() {
    const container = document.getElementById('familyTreeContainer');
    
    // Crear copos de nieve mejorados con diferentes tamaños
    const snowSizes = ['small', 'medium', 'large'];
    for (let i = 0; i < 20; i++) {
        const snowflake = document.createElement('div');
        const size = snowSizes[Math.floor(Math.random() * snowSizes.length)];
        snowflake.className = `tree-snow ${size}`;
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.animationDelay = Math.random() * 12 + 's';
        snowflake.style.animationDuration = (Math.random() * 6 + 8) + 's';
        
        container.appendChild(snowflake);
    }
    
    // Agregar luces navideñas BIEN ACOMODADAS - Siguiendo las capas exactas
    const lightColors = ['light-red', 'light-yellow', 'light-blue', 'light-green', 'light-purple', 'light-orange'];
    const lightPositions = [
        // Capa 4 (inferior) - Y: 73-83%, X: 34-66% - LA MÁS GRANDE
        { x: 36, y: 78 }, { x: 39, y: 76 }, { x: 42, y: 78 }, { x: 45, y: 76 },
        { x: 48, y: 78 }, { x: 50, y: 76 }, { x: 52, y: 78 }, { x: 55, y: 76 },
        { x: 58, y: 78 }, { x: 61, y: 76 }, { x: 64, y: 78 },
        
        // Capa 3 (media) - Y: 58-68%, X: 39-61%
        { x: 41, y: 63 }, { x: 44, y: 61 }, { x: 47, y: 63 }, { x: 50, y: 61 },
        { x: 53, y: 63 }, { x: 56, y: 61 }, { x: 59, y: 63 },
        
        // Capa 2 (media-superior) - Y: 43-53%, X: 43-57%
        { x: 45, y: 48 }, { x: 47, y: 46 }, { x: 49, y: 48 }, { x: 51, y: 46 },
        { x: 53, y: 48 }, { x: 55, y: 46 },
        
        // Capa 1 (superior) - Y: 30-40%, X: 47-53% - LA MÁS PEQUEÑA
        { x: 48, y: 35 }, { x: 50, y: 33 }, { x: 52, y: 35 }
    ];
    
    lightPositions.forEach((pos, index) => {
        const light = document.createElement('div');
        light.className = `christmas-lights ${lightColors[index % lightColors.length]}`;
        light.style.left = pos.x + '%';
        light.style.top = pos.y + '%';
        light.style.animationDelay = (index * 0.3) + 's';
        
        container.appendChild(light);
    });
}

function openSphereModal(user) {
    const modal = document.getElementById('sphereModal');
    if (!modal) {
        console.error('Modal no encontrado');
        return;
    }
    
    currentSphereModal = user;
    
    // Llenar datos del modal
    const avatar = document.getElementById('sphereModalAvatar');
    const name = document.getElementById('sphereModalName');
    const message = document.getElementById('sphereModalMessage');
    
    if (avatar) avatar.textContent = user.avatar;
    if (name) name.textContent = user.name;
    if (message) message.textContent = user.nice_message;
    
    // Mostrar modal con animación
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
}

function closeSphereModal() {
    const modal = document.getElementById('sphereModal');
    if (!modal) {
        console.error('Modal no encontrado');
        return;
    }
    
    modal.classList.remove('show');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        currentSphereModal = null;
    }, 300);
}

// Funcionalidad de voz CHILENA REALISTA mejorada
async function playVoiceMessage() {
    if (!currentSphereModal || !('speechSynthesis' in window)) {
        showToast('❌ Funcionalidad de voz no disponible');
        return;
    }
    
    try {
        // Cancelar cualquier síntesis en curso
        speechSynthesis.cancel();
        
        // Mensaje más natural y chileno
        const chileanMessage = adaptMessageToChilean(currentSphereModal.nice_message, currentSphereModal.name);
        
        const utterance = new SpeechSynthesisUtterance(chileanMessage);
        
        // Esperar a que las voces estén cargadas
        await loadVoices();
        
        // Buscar la mejor voz chilena/latina disponible
        const voices = speechSynthesis.getVoices();
        const bestVoice = findBestChileanVoice(voices);
        
        if (bestVoice) {
            utterance.voice = bestVoice;
            console.log('🇨🇱 Usando voz:', bestVoice.name, bestVoice.lang);
        }
        
        // Configuración para acento chileno SÚPER REALISTA
        utterance.lang = bestVoice ? bestVoice.lang : 'es-CL';
        utterance.rate = 0.9;   // Velocidad natural de conversación chilena
        utterance.pitch = 0.85; // Tono grave y cálido (menos robótico)
        utterance.volume = 1.0;
        
        // Event listeners para feedback
        utterance.onstart = () => {
            document.getElementById('playVoiceBtn').innerHTML = '<span>🎙️ Hablando...</span>';
            document.getElementById('playVoiceBtn').disabled = true;
        };
        
        utterance.onend = () => {
            document.getElementById('playVoiceBtn').innerHTML = '<span>🔊 Escuchar Mensaje</span>';
            document.getElementById('playVoiceBtn').disabled = false;
        };
        
        utterance.onerror = (event) => {
            console.error('Error de voz:', event.error);
            showToast('❌ Error al reproducir el mensaje');
            document.getElementById('playVoiceBtn').innerHTML = '<span>🔊 Escuchar Mensaje</span>';
            document.getElementById('playVoiceBtn').disabled = false;
        };
        
        speechSynthesis.speak(utterance);
        
    } catch (error) {
        console.error('Error en síntesis de voz:', error);
        showToast('❌ Error al reproducir el mensaje');
    }
}

// Función para cargar voces disponibles
function loadVoices() {
    return new Promise((resolve) => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
        } else {
            speechSynthesis.onvoiceschanged = () => {
                resolve(speechSynthesis.getVoices());
            };
        }
    });
}

// Función para encontrar la mejor voz chilena (más natural y menos robótica)
function findBestChileanVoice(voices) {
    console.log('🎤 Voces disponibles:', voices.map(v => `${v.name} (${v.lang})`));
    
    // Prioridad de voces (de mejor a peor para chileno realista)
    const voicePriorities = [
        // Google voces premium (las más naturales)
        (voice) => voice.name.includes('Google') && voice.lang === 'es-CL',
        (voice) => voice.name.includes('Google') && voice.lang === 'es-AR',
        (voice) => voice.name.includes('Google') && voice.lang === 'es-MX',
        
        // Voces chilenas específicas
        (voice) => voice.lang === 'es-CL',
        
        // Microsoft Neural (muy naturales)
        (voice) => voice.name.includes('Neural') && voice.lang.startsWith('es-'),
        
        // Voces latinoamericanas
        (voice) => voice.lang === 'es-AR' || voice.lang === 'es-MX' || voice.lang === 'es-CO',
        
        // Voces españolas premium con nombres que suenan naturales
        (voice) => (voice.name.includes('Premium') || voice.name.includes('Enhanced')) && voice.lang.startsWith('es'),
        
        // Voces con nombres chilenos/latinos comunes
        (voice) => {
            const name = voice.name.toLowerCase();
            return (name.includes('diego') || name.includes('carlos') || 
                   name.includes('juan') || name.includes('jorge') ||
                   name.includes('lucia') || name.includes('monica')) && voice.lang.startsWith('es');
        },
        
        // Voces femeninas (suelen sonar más naturales)
        (voice) => voice.lang.startsWith('es') && (voice.name.toLowerCase().includes('female') || 
                                                    voice.name.toLowerCase().includes('woman')),
        
        // Cualquier voz española masculina
        (voice) => voice.lang.startsWith('es') && voice.name.toLowerCase().includes('male'),
        
        // Cualquier voz española disponible
        (voice) => voice.lang.startsWith('es')
    ];
    
    for (let priority of voicePriorities) {
        const voice = voices.find(priority);
        if (voice) {
            console.log('✅ Voz seleccionada:', voice.name, voice.lang);
            return voice;
        }
    }
    
    console.log('⚠️ No se encontró voz española, usando default');
    return null;
}

// Función para adaptar el mensaje al chileno CON PAUSAS NATURALES
function adaptMessageToChilean(message, name) {
    // Hacer el mensaje más chileno y natural
    let chileanMessage = message;
    
    // Agregar pausas naturales (las comas hacen que la voz pause)
    // Esto hace que suene MUCHO menos robótico
    chileanMessage = chileanMessage.replace(/\. /g, '. ... '); // Pausa larga después de punto
    chileanMessage = chileanMessage.replace(/y /g, ', y ');     // Pausa antes de "y"
    chileanMessage = chileanMessage.replace(/pero /g, ', pero '); // Pausa antes de "pero"
    
    // Reemplazos para sonar más chileno
    const chileanReplacements = {
        'te queremos harto': 'te queremos, caleta',
        'muy bonito': 'súper bonito',
        'eres el más': 'erí el más',
        'que hace': 'que hací',
        'tienes': 'tení',
        'eres': 'erí',
        'haces': 'hací',
        'vienes': 'vení',
        'familia': 'la familia',
        'siempre': 'siempre, siempre'
    };
    
    // Aplicar reemplazos
    for (let [original, replacement] of Object.entries(chileanReplacements)) {
        chileanMessage = chileanMessage.replace(new RegExp(original, 'gi'), replacement);
    }
    
    // Agregar muletillas chilenas naturales
    const muletillas = ['oye', 'cachai', 'po', 'weon'];
    const randomMuletilla = muletillas[Math.floor(Math.random() * muletillas.length)];
    
    // Construir mensaje final más natural
    const greetings = [
        `Hola ${name}, ${randomMuletilla}`,
        `Oye ${name}`,
        `${name}, cachai que`,
        `Escucha ${name}`
    ];
    
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    return `${randomGreeting}. ${chileanMessage}. ¡Feliz Navidad, po!`;
}

// Generar código QR para la esfera
function generateQRCode() {
    if (!currentSphereModal) return;
    
    try {
        const qrData = {
            type: 'family_sphere',
            user_id: currentSphereModal.id,
            name: currentSphereModal.name,
            message: currentSphereModal.nice_message,
            avatar: currentSphereModal.avatar,
            timestamp: Date.now()
        };
        
        const qrString = JSON.stringify(qrData);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
        
        // Crear modal de QR
        const qrModal = document.createElement('div');
        qrModal.className = 'sphere-modal show';
        qrModal.innerHTML = `
            <div class="sphere-modal-overlay"></div>
            <div class="sphere-modal-content" style="text-align: center;">
                <button class="sphere-modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
                <h3 style="color: var(--color-primary); margin-bottom: 20px;">
                    📱 Código QR para ${currentSphereModal.name}
                </h3>
                <img src="${qrUrl}" alt="QR Code" style="max-width: 100%; border-radius: 12px; box-shadow: var(--shadow-md);">
                <p style="margin-top: 15px; color: var(--color-text-light); font-size: 14px;">
                    Escanea este código para pegar en el árbol real 🎄
                </p>
                <button class="btn-primary" onclick="this.parentElement.parentElement.remove()" style="margin-top: 15px;">
                    <span>✅ Listo</span>
                </button>
            </div>
        `;
        
        document.body.appendChild(qrModal);
        
        showToast('📱 ¡Código QR generado!');
        
    } catch (error) {
        console.error('Error al generar QR:', error);
        showToast('❌ Error al generar código QR');
    }
}

// Regenerar mensajes (solo admin)
async function regenerateMessages() {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede regenerar mensajes');
        return;
    }
    
    if (!confirm('¿Regenerar todos los mensajes bonitos? Esto reemplazará los mensajes actuales.')) {
        return;
    }
    
    try {
        showToast('✨ Regenerando mensajes...');
        
        // Limpiar mensajes guardados
        localStorage.removeItem('familyMessages');
        
        // Recargar árbol familiar
        await loadFamilyTree();
        
        showToast('✅ ¡Mensajes regenerados con éxito!');
        
        // Notificación
        await createNotification('success', 'Mensajes Actualizados', 'Se han regenerado todos los mensajes bonitos del árbol familiar', '✨');
        
    } catch (error) {
        console.error('Error al regenerar mensajes:', error);
        showToast('❌ Error al regenerar mensajes');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function registerEventListeners() {
    // Login
    document.getElementById('loginBtn')?.addEventListener('click', () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        login(email, password);
    });
    
    // Enter en login
    document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('loginBtn').click();
        }
    });
    
    // Ir a registro
    document.getElementById('registerBtn')?.addEventListener('click', () => {
        showScreen('registerScreen');
    });
    
    // Volver a login
    document.getElementById('backToLoginBtn')?.addEventListener('click', () => {
        showScreen('loginScreen');
    });
    
    // Confirmar registro
    document.getElementById('confirmRegisterBtn')?.addEventListener('click', () => {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        register(name, email, password);
    });
    
    // Abrir regalo
    document.getElementById('openGiftBtn')?.addEventListener('click', () => {
        revealGift();
    });
    
    // Ver detalles del resultado guardado
    document.getElementById('viewAgainBtn')?.addEventListener('click', () => {
        showScreen('giftScreen');
        // Mostrar directamente el resultado sin loading
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('revealState').classList.remove('hidden');
    });
    
    // Volver a inicio desde regalo
    document.getElementById('backToHomeBtn')?.addEventListener('click', () => {
        showScreen('homeScreen');
        // Actualizar la vista para mostrar el resultado guardado
        displaySavedResult();
    });
    
    // Ejecutar sorteo (admin)
    document.getElementById('adminDrawBtn')?.addEventListener('click', () => {
        if (confirm('¿Ejecutar el sorteo navideño? Esta acción borrará sorteos anteriores.')) {
            performDraw();
        }
    });
    
    // Reiniciar sorteo (admin)
    document.getElementById('resetDrawBtn')?.addEventListener('click', () => {
        resetDraw();
    });
    
    // Ver todos los resultados (admin)
    document.getElementById('viewResultsBtn')?.addEventListener('click', () => {
        viewDrawResults();
    });
    
    // Borrar notificaciones (admin)
    document.getElementById('deleteNotificationsBtn')?.addEventListener('click', () => {
        deleteAllNotifications();
    });
    
    // Regenerar mensajes del árbol (admin)
    document.getElementById('regenerateMessagesBtn')?.addEventListener('click', () => {
        regenerateMessages();
    });
    
    // Modal de esfera - cerrar
    document.getElementById('sphereModalClose')?.addEventListener('click', () => {
        closeSphereModal();
    });
    
    document.getElementById('sphereModalOverlay')?.addEventListener('click', () => {
        closeSphereModal();
    });
    
    // Modal de esfera - reproducir voz
    document.getElementById('playVoiceBtn')?.addEventListener('click', () => {
        playVoiceMessage();
    });
    
    // Modal de esfera - generar QR
    document.getElementById('generateQRBtn')?.addEventListener('click', () => {
        generateQRCode();
    });
    
    // Cambiar tema
    document.getElementById('toggleThemeBtn')?.addEventListener('click', () => {
        toggleTheme();
    });
    
    // Cerrar sesión
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        logout();
    });
    
    // Navegación inferior
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const screen = item.dataset.screen;
            if (screen) {
                showScreen(screen);
                
                // Cargar datos según la pantalla
                if (screen === 'participantsScreen') {
                    loadFamilyTree();
                } else if (screen === 'notificationsScreen') {
                    loadNotifications();
                } else if (screen === 'giftScreen') {
                    revealGift();
                } else if (screen === 'profileScreen') {
                    updateAdminUI();
                    loadAdminMessage();
                } else if (screen === 'galleryScreen') {
                    loadPhotos();
                } else if (screen === 'pollsScreen') {
                    loadPolls();
                }
            }
        });
    });
    
    // Event listeners para Galería de Fotos
    document.getElementById('uploadPhotoBtn')?.addEventListener('click', () => {
        uploadPhoto();
    });
    
    document.getElementById('deleteAllPhotosBtn')?.addEventListener('click', () => {
        deleteAllPhotos();
    });
    
    // Event listeners para Votaciones
    document.getElementById('createPollBtn')?.addEventListener('click', () => {
        createPoll();
    });
    
    // Event listeners para Mensaje del Admin
    document.getElementById('saveAdminMessageBtn')?.addEventListener('click', () => {
        saveAdminMessage();
    });
    
    document.getElementById('deleteAdminMessageBtn')?.addEventListener('click', () => {
        deleteAdminMessage();
    });
}

// ============================================
// REALTIME (SUPABASE)
// ============================================

// Suscribirse a cambios en notificaciones
supabase
    .channel('notifications-channel')
    .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
            const newNotif = payload.new;
            showFloatingNotification(newNotif.message, newNotif.icon);
            loadNotifications();
        }
    )
    .subscribe();

// Suscribirse a cambios en draw_results
supabase
    .channel('draw-channel')
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'draw_results' },
        async () => {
            await loadUserDrawResult();
            displaySavedResult();
            
            // Agregar animación y badge al botón de regalo si el usuario no ha revelado
            if (AppState.drawResult && !AppState.drawResult.revealed_at) {
                addGiftNotificationBadge();
            }
            
            showFloatingNotification('¡El sorteo ha sido actualizado! 🎁', '🎉');
        }
    )
    .subscribe();

console.log('🎄 Event listeners registrados');
console.log('🔔 Subscripciones en tiempo real activas');
