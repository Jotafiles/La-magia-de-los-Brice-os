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

function checkExistingSession() {
    const savedUser = localStorage.getItem('navidadRandomUser');
    
    if (savedUser) {
        try {
            AppState.currentUser = JSON.parse(savedUser);
            AppState.isAdmin = AppState.currentUser.role === 'admin';
            navigateToHome();
        } catch (error) {
            console.error('Error al cargar sesión:', error);
            localStorage.removeItem('navidadRandomUser');
        }
    }
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
        const { data, error } = await supabase
            .from('draw_results')
            .select(`
                *,
                receiver:users!draw_results_receiver_id_fkey(*)
            `)
            .eq('giver_id', AppState.currentUser.id)
            .single();
        
        if (error) {
            // No hay resultado aún
            AppState.drawResult = null;
            return;
        }
        
        AppState.drawResult = data;
        
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
        
        if (error) throw error;
        
        AppState.participants = data;
        displayParticipants(data);
        
        // Actualizar contador en perfil
        document.getElementById('statParticipants').textContent = data.length;
        
    } catch (error) {
        console.error('Error al cargar participantes:', error);
        showToast('❌ Error al cargar participantes');
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
                    loadParticipants();
                } else if (screen === 'notificationsScreen') {
                    loadNotifications();
                } else if (screen === 'giftScreen') {
                    revealGift();
                } else if (screen === 'profileScreen') {
                    updateAdminUI();
                }
            }
        });
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
