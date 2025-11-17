// ============================================
// CONSTELACIÓN FAMILIAR
// Sistema de visualización de participantes como estrellas
// MOBILE-FIRST, ULTRA OPTIMIZADO, PRODUCTION READY
// ============================================

// Variables globales de la constelación
let constellationData = [];
let currentStarModal = null;
let canvas = null;
let ctx = null;
let animationFrame = null;

// Colores disponibles para las estrellas
const STAR_COLORS = [
    'gold', 'blue', 'pink', 'green', 
    'purple', 'orange', 'cyan', 'lime'
];

// ============================================
// FUNCIÓN PRINCIPAL: Cargar Constelación
// ============================================
async function loadFamilyConstellation() {
    try {
        const container = document.getElementById('familyTreeContainer');
        if (!container) return;
        
        // Mostrar loading
        container.innerHTML = `
            <canvas id="constellationCanvas"></canvas>
            <div class="stars-container" id="starsContainer"></div>
            <div class="loading-participants">
                <div class="spinning-gift">⭐</div>
                <p>Iluminando las estrellas...</p>
            </div>
        `;
        
        // Cargar participantes desde Supabase
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="loading-participants">
                    <div class="empty-icon">⭐</div>
                    <p>No hay participantes aún</p>
                </div>
            `;
            return;
        }
        
        // Generar mensajes para cada usuario
        const usersWithMessages = await generateNiceMessages(users);
        constellationData = usersWithMessages;
        
        // Inicializar canvas
        initializeCanvas();
        
        // Renderizar constelación
        renderConstellation(usersWithMessages);
        
        // Iniciar animaciones
        startConstellationAnimation();
        
        // Crear partículas de nieve
        createSnowParticles();
        
    } catch (error) {
        console.error('Error al cargar constelación:', error);
        showToast('❌ Error al cargar la constelación familiar');
    }
}

// ============================================
// GENERAR MENSAJES BONITOS
// ============================================
async function generateNiceMessages(users) {
    const usersWithMessages = [];
    const savedMessages = JSON.parse(localStorage.getItem('familyMessages') || '{}');
    
    for (let user of users) {
        let niceMessage = savedMessages[user.id];
        
        if (!niceMessage) {
            // Usar mensajes existentes o generar uno nuevo
            niceMessage = chileanMessages[Math.floor(Math.random() * chileanMessages.length)];
            savedMessages[user.id] = niceMessage;
        }
        
        usersWithMessages.push({
            ...user,
            nice_message: niceMessage
        });
    }
    
    localStorage.setItem('familyMessages', JSON.stringify(savedMessages));
    return usersWithMessages;
}

// ============================================
// INICIALIZAR CANVAS
// ============================================
function initializeCanvas() {
    canvas = document.getElementById('constellationCanvas');
    if (!canvas) return;
    
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    ctx = canvas.getContext('2d');
    
    // Ajustar canvas en resize
    window.addEventListener('resize', () => {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        drawConstellationLines();
    });
}

// ============================================
// RENDERIZAR CONSTELACIÓN
// ============================================
function renderConstellation(users) {
    const starsContainer = document.getElementById('starsContainer');
    if (!starsContainer) return;
    
    // Limpiar loading y contenedor
    const loading = document.querySelector('.loading-participants');
    if (loading) loading.remove();
    
    starsContainer.innerHTML = '';
    
    // Calcular posiciones de las estrellas
    const positions = calculateStarPositions(users.length);
    
    users.forEach((user, index) => {
        const star = createStar(user, positions[index], index);
        starsContainer.appendChild(star);
    });
    
    // Dibujar líneas de constelación
    setTimeout(() => drawConstellationLines(), 100);
}

// ============================================
// CALCULAR POSICIONES DE ESTRELLAS
// Distribución inteligente y balanceada
// ============================================
function calculateStarPositions(count) {
    const positions = [];
    const padding = 60; // Margen desde los bordes
    
    if (!canvas) return positions;
    
    const width = canvas.width - (padding * 2);
    const height = canvas.height - (padding * 2);
    
    // Distribución en espiral dorada (phi-based)
    const phi = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = 360 / phi;
    
    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = (angleIncrement * i) * (Math.PI / 180);
        const radius = Math.sqrt(t) * Math.min(width, height) * 0.45;
        
        // Añadir variación aleatoria suave
        const randomOffset = {
            x: (Math.random() - 0.5) * 40,
            y: (Math.random() - 0.5) * 40
        };
        
        const x = padding + (width / 2) + (Math.cos(angle) * radius) + randomOffset.x;
        const y = padding + (height / 2) + (Math.sin(angle) * radius) + randomOffset.y;
        
        positions.push({
            x: Math.max(padding, Math.min(canvas.width - padding, x)),
            y: Math.max(padding, Math.min(canvas.height - padding, y))
        });
    }
    
    return positions;
}

// ============================================
// CREAR ESTRELLA INDIVIDUAL
// ============================================
function createStar(user, position, index) {
    const star = document.createElement('div');
    star.className = 'family-star';
    star.style.left = position.x + 'px';
    star.style.top = position.y + 'px';
    
    // Asignar color
    const color = STAR_COLORS[index % STAR_COLORS.length];
    star.setAttribute('data-color', color);
    star.setAttribute('data-user-id', user.id);
    
    // Delay de animación aleatorio
    star.style.animationDelay = (Math.random() * 2) + 's';
    
    // Contenido de la estrella
    star.innerHTML = `
        <div class="star-inner">
            <svg class="star-svg" viewBox="0 0 51 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M25.5 0L31.4084 17.7295H49.9554L34.7735 28.6705L40.6819 46.4L25.5 35.459L10.3181 46.4L16.2265 28.6705L1.04456 17.7295H19.5916L25.5 0Z"/>
            </svg>
            <div class="star-avatar">${user.avatar || '⭐'}</div>
            <div class="star-label">${user.name}</div>
        </div>
    `;
    
    // Event listeners - Touch friendly
    star.addEventListener('click', () => openStarModal(user));
    star.addEventListener('touchstart', (e) => {
        e.preventDefault();
        star.classList.add('touched');
        setTimeout(() => star.classList.remove('touched'), 600);
    });
    star.addEventListener('touchend', (e) => {
        e.preventDefault();
        openStarModal(user);
    });
    
    return star;
}

// ============================================
// DIBUJAR LÍNEAS DE CONSTELACIÓN
// Conecta estrellas cercanas con líneas suaves
// ============================================
function drawConstellationLines() {
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const stars = document.querySelectorAll('.family-star');
    const positions = Array.from(stars).map(star => ({
        x: parseFloat(star.style.left),
        y: parseFloat(star.style.top),
        color: star.getAttribute('data-color')
    }));
    
    // Conectar estrellas cercanas
    const maxDistance = 200; // Distancia máxima para conexión
    
    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            const dist = distance(positions[i], positions[j]);
            
            if (dist < maxDistance) {
                const opacity = 1 - (dist / maxDistance);
                drawLine(positions[i], positions[j], opacity);
            }
        }
    }
}

// Función auxiliar: calcular distancia
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Dibujar línea con efecto glow
function drawLine(p1, p2, opacity) {
    if (!ctx) return;
    
    ctx.save();
    
    // Línea principal con glow
    ctx.strokeStyle = `rgba(100, 150, 255, ${opacity * 0.3})`;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgba(150, 200, 255, ${opacity * 0.5})`;
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    
    ctx.restore();
}

// ============================================
// ANIMACIÓN DE CONSTELACIÓN
// Redibuja líneas suavemente
// ============================================
function startConstellationAnimation() {
    let frame = 0;
    
    function animate() {
        frame++;
        
        // Redibujar cada 60 frames (aprox 1 segundo a 60fps)
        if (frame % 60 === 0) {
            drawConstellationLines();
        }
        
        animationFrame = requestAnimationFrame(animate);
    }
    
    animate();
}

// Detener animación
function stopConstellationAnimation() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

// ============================================
// CREAR PARTÍCULAS DE NIEVE
// ============================================
function createSnowParticles() {
    const container = document.getElementById('starsContainer');
    if (!container) return;
    
    const particleCount = 30; // Menos partículas para mejor rendimiento móvil
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'snow-particle';
        
        // Tamaño aleatorio
        const size = Math.random() * 3 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        // Posición inicial aleatoria
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = '-10px';
        
        // Duración de animación aleatoria
        const duration = Math.random() * 10 + 15;
        particle.style.animationDuration = duration + 's';
        
        // Delay aleatorio
        const delay = Math.random() * 5;
        particle.style.animationDelay = delay + 's';
        
        container.appendChild(particle);
    }
}

// ============================================
// ABRIR MODAL DE ESTRELLA
// ============================================
function openStarModal(user) {
    const modal = document.getElementById('sphereModal');
    if (!modal) {
        console.error('Modal no encontrado');
        return;
    }
    
    currentStarModal = user;
    
    // Llenar datos del modal
    const avatar = document.getElementById('sphereModalAvatar');
    const name = document.getElementById('sphereModalName');
    const message = document.getElementById('sphereModalMessage');
    
    if (avatar) avatar.textContent = user.avatar || '⭐';
    if (name) name.textContent = user.name;
    if (message) message.textContent = user.nice_message;
    
    // Mostrar modal con animación
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
    
    // Pausar animación de constelación para mejor rendimiento
    stopConstellationAnimation();
}

// ============================================
// CERRAR MODAL DE ESTRELLA
// ============================================
function closeStarModal() {
    const modal = document.getElementById('sphereModal');
    if (!modal) {
        console.error('Modal no encontrado');
        return;
    }
    
    modal.classList.remove('show');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        currentStarModal = null;
        
        // Reanudar animación de constelación
        startConstellationAnimation();
    }, 300);
}

// ============================================
// GENERAR CÓDIGO QR
// ============================================
async function generateConstellationQR() {
    if (!currentStarModal) {
        showToast('⚠️ No hay estrella seleccionada');
        return;
    }
    
    try {
        const text = `${currentStarModal.name}\n\n${currentStarModal.nice_message}\n\n🎄 Navidad ${new Date().getFullYear()}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(text)}`;
        
        // Abrir en nueva pestaña
        window.open(qrUrl, '_blank');
        
        showToast('📱 Código QR generado!');
    } catch (error) {
        console.error('Error al generar QR:', error);
        showToast('❌ Error al generar código QR');
    }
}

// ============================================
// REGENERAR MENSAJES
// (Solo para admins)
// ============================================
async function regenerateConstellationMessages() {
    if (!AppState.isAdmin) {
        showToast('⚠️ Solo administradores pueden hacer esto');
        return;
    }
    
    try {
        // Limpiar mensajes guardados
        localStorage.removeItem('familyMessages');
        
        // Recargar constelación
        await loadFamilyConstellation();
        
        showToast('✅ ¡Mensajes regenerados con éxito!');
    } catch (error) {
        console.error('Error al regenerar mensajes:', error);
        showToast('❌ Error al regenerar mensajes');
    }
}

// ============================================
// LIMPIAR AL SALIR DE LA PANTALLA
// ============================================
function cleanupConstellation() {
    stopConstellationAnimation();
    
    // Limpiar canvas
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================
window.loadFamilyConstellation = loadFamilyConstellation;
window.openStarModal = openStarModal;
window.closeStarModal = closeStarModal;
window.generateConstellationQR = generateConstellationQR;
window.regenerateConstellationMessages = regenerateConstellationMessages;
window.cleanupConstellation = cleanupConstellation;

console.log('✨ Constelación Familiar cargada');
