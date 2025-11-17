// ============================================
// SUPABASE REALTIME - ACTUALIZACIONES EN TIEMPO REAL
// Sin recargar la página, todo se actualiza automáticamente
// ============================================

let realtimeSubscriptions = [];

// ============================================
// INICIALIZAR REALTIME
// ============================================
function initializeRealtime() {
    console.log('🔴 Iniciando Supabase Realtime...');
    
    // Limpiar subscripciones anteriores
    cleanupRealtime();
    
    // Suscribirse a cambios en usuarios (estrellas/participantes)
    subscribeToUsers();
    
    // Suscribirse a cambios en fotos
    subscribeToPhotos();
    
    // Suscribirse a cambios en encuestas
    subscribeToPolls();
    
    // Suscribirse a cambios en votos
    subscribeToPollVotes();
    
    // Suscribirse a mensaje admin
    subscribeToAdminMessage();
    
    // Suscribirse a notificaciones
    subscribeToNotifications();
    
    console.log('✅ Realtime activado - Todo se actualiza automáticamente');
}

// ============================================
// SUSCRIPCIÓN: USUARIOS (ESTRELLAS)
// ============================================
function subscribeToUsers() {
    const usersChannel = supabase
        .channel('users-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'users' 
            }, 
            (payload) => {
                console.log('👤 Usuario actualizado:', payload);
                handleUserChange(payload);
            }
        )
        .subscribe();
    
    realtimeSubscriptions.push(usersChannel);
}

function handleUserChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Actualizar estado global
    if (eventType === 'INSERT') {
        // Nuevo usuario agregado
        AppState.participants.push(newRecord);
        showToast('✨ Nuevo participante agregado: ' + newRecord.name);
    } else if (eventType === 'UPDATE') {
        // Usuario actualizado
        const index = AppState.participants.findIndex(p => p.id === newRecord.id);
        if (index !== -1) {
            AppState.participants[index] = newRecord;
        }
    } else if (eventType === 'DELETE') {
        // Usuario eliminado
        AppState.participants = AppState.participants.filter(p => p.id !== oldRecord.id);
        showToast('❌ Participante eliminado');
    }
    
    // Recargar la constelación si estamos en esa pantalla
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    if (currentScreen && currentScreen.id === 'participantsScreen') {
        debounce(() => {
            if (typeof loadFamilyConstellation === 'function') {
                loadFamilyConstellation();
            }
        }, 1000)();
    }
}

// ============================================
// SUSCRIPCIÓN: FOTOS
// ============================================
function subscribeToPhotos() {
    const photosChannel = supabase
        .channel('photos-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'photos' 
            }, 
            (payload) => {
                console.log('📸 Foto actualizada:', payload);
                handlePhotoChange(payload);
            }
        )
        .subscribe();
    
    realtimeSubscriptions.push(photosChannel);
}

function handlePhotoChange(payload) {
    const { eventType, new: newRecord } = payload;
    
    // Recargar fotos solo si estamos en la pantalla de galería
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    if (currentScreen && currentScreen.id === 'galleryScreen') {
        if (eventType === 'INSERT') {
            showToast('📸 Nueva foto agregada');
        }
        
        // Recargar con debounce para evitar múltiples recargas
        debounce(() => {
            if (typeof loadPhotos === 'function') {
                loadPhotos();
            }
        }, 500)();
    }
}

// ============================================
// SUSCRIPCIÓN: FOTO LIKES
// ============================================
function subscribeToPhotoLikes() {
    const likesChannel = supabase
        .channel('photo-likes-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'photo_likes' 
            }, 
            (payload) => {
                console.log('❤️ Like actualizado:', payload);
                handlePhotoLikeChange(payload);
            }
        )
        .subscribe();
    
    realtimeSubscriptions.push(likesChannel);
}

function handlePhotoLikeChange(payload) {
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    if (currentScreen && currentScreen.id === 'galleryScreen') {
        // Recargar fotos para actualizar contador de likes
        debounce(() => {
            if (typeof loadPhotos === 'function') {
                loadPhotos();
            }
        }, 500)();
    }
}

// ============================================
// SUSCRIPCIÓN: ENCUESTAS
// ============================================
function subscribeToPolls() {
    const pollsChannel = supabase
        .channel('polls-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'polls' 
            }, 
            (payload) => {
                console.log('🗳️ Encuesta actualizada:', payload);
                handlePollChange(payload);
            }
        )
        .subscribe();
    
    realtimeSubscriptions.push(pollsChannel);
}

function handlePollChange(payload) {
    const { eventType, new: newRecord } = payload;
    
    if (eventType === 'INSERT') {
        showToast('🗳️ Nueva encuesta creada');
    }
    
    // Recargar encuestas si estamos en esa pantalla
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    if (currentScreen && currentScreen.id === 'pollsScreen') {
        debounce(() => {
            if (typeof loadPolls === 'function') {
                loadPolls();
            }
        }, 500)();
    }
}

// ============================================
// SUSCRIPCIÓN: VOTOS
// ============================================
function subscribeToPollVotes() {
    const votesChannel = supabase
        .channel('poll-votes-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'poll_votes' 
            }, 
            (payload) => {
                console.log('✅ Voto registrado:', payload);
                handlePollVoteChange(payload);
            }
        )
        .subscribe();
    
    realtimeSubscriptions.push(votesChannel);
}

function handlePollVoteChange(payload) {
    // Recargar encuestas para mostrar resultados actualizados
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    if (currentScreen && currentScreen.id === 'pollsScreen') {
        debounce(() => {
            if (typeof loadPolls === 'function') {
                loadPolls();
            }
        }, 500)();
    }
}

// ============================================
// SUSCRIPCIÓN: MENSAJE ADMIN
// ============================================
function subscribeToAdminMessage() {
    const messageChannel = supabase
        .channel('admin-message-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'admin_message' 
            }, 
            (payload) => {
                console.log('📢 Mensaje admin actualizado:', payload);
                handleAdminMessageChange(payload);
            }
        )
        .subscribe();
    
    realtimeSubscriptions.push(messageChannel);
}

function handleAdminMessageChange(payload) {
    const { eventType } = payload;
    
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
        // Recargar mensaje admin en todas las pantallas
        if (typeof loadAdminMessage === 'function') {
            loadAdminMessage();
        }
        showToast('📢 Mensaje del administrador actualizado');
    }
}

// ============================================
// SUSCRIPCIÓN: NOTIFICACIONES
// ============================================
function subscribeToNotifications() {
    const notificationsChannel = supabase
        .channel('notifications-changes')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications' 
            }, 
            (payload) => {
                console.log('🔔 Nueva notificación:', payload);
                handleNotificationChange(payload);
            }
        )
        .subscribe();
    
    realtimeSubscriptions.push(notificationsChannel);
}

function handleNotificationChange(payload) {
    const { new: newRecord } = payload;
    
    // Mostrar toast con la notificación
    if (newRecord) {
        showToast(newRecord.icon + ' ' + newRecord.title);
    }
    
    // Recargar notificaciones si estamos en esa pantalla
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    if (currentScreen && currentScreen.id === 'notificationsScreen') {
        debounce(() => {
            if (typeof loadNotifications === 'function') {
                loadNotifications();
            }
        }, 500)();
    }
}

// ============================================
// LIMPIAR SUBSCRIPCIONES
// ============================================
function cleanupRealtime() {
    realtimeSubscriptions.forEach(channel => {
        supabase.removeChannel(channel);
    });
    realtimeSubscriptions = [];
}

// ============================================
// UTILIDAD: DEBOUNCE
// Evita ejecutar funciones múltiples veces seguidas
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// UTILIDAD: THROTTLE
// Limita la frecuencia de ejecución de funciones
// ============================================
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// OPTIMIZACIÓN: LAZY LOADING IMÁGENES
// ============================================
function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        // Observar todas las imágenes con data-src
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// ============================================
// OPTIMIZACIÓN: VIRTUAL SCROLLING
// Para listas largas de fotos/notificaciones
// ============================================
function setupVirtualScrolling(container, items, renderItem) {
    if (!container || !items || items.length === 0) return;
    
    const itemHeight = 200; // Altura aproximada de cada item
    const visibleItems = Math.ceil(window.innerHeight / itemHeight) + 2;
    let scrollTop = 0;
    
    const render = throttle(() => {
        scrollTop = container.scrollTop;
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleItems, items.length);
        
        const visibleSlice = items.slice(startIndex, endIndex);
        container.innerHTML = visibleSlice.map((item, i) => 
            renderItem(item, startIndex + i)
        ).join('');
    }, 100);
    
    container.addEventListener('scroll', render);
    render();
}

// ============================================
// OPTIMIZACIÓN: REQUEST ANIMATION FRAME
// Para animaciones suaves
// ============================================
const rafOptimization = {
    callbacks: [],
    running: false,
    
    add(callback) {
        this.callbacks.push(callback);
        if (!this.running) {
            this.start();
        }
    },
    
    start() {
        this.running = true;
        const animate = () => {
            this.callbacks.forEach(cb => cb());
            if (this.callbacks.length > 0) {
                requestAnimationFrame(animate);
            } else {
                this.running = false;
            }
        };
        requestAnimationFrame(animate);
    },
    
    remove(callback) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }
};

// ============================================
// OPTIMIZACIÓN: MEMORY CLEANUP
// Limpia elementos DOM no usados
// ============================================
function cleanupUnusedElements() {
    // Limpiar imágenes no visibles después de 5 minutos
    setTimeout(() => {
        document.querySelectorAll('img').forEach(img => {
            const rect = img.getBoundingClientRect();
            const isVisible = (
                rect.top >= -window.innerHeight &&
                rect.bottom <= window.innerHeight * 2
            );
            
            if (!isVisible && img.src && !img.dataset.src) {
                img.dataset.src = img.src;
                img.src = '';
            }
        });
    }, 300000);
}

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================
window.initializeRealtime = initializeRealtime;
window.cleanupRealtime = cleanupRealtime;
window.debounce = debounce;
window.throttle = throttle;
window.setupLazyLoading = setupLazyLoading;
window.setupVirtualScrolling = setupVirtualScrolling;
window.rafOptimization = rafOptimization;

console.log('🚀 Realtime.js cargado - Listo para actualizaciones en tiempo real');
