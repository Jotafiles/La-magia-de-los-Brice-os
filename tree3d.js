// ============================================
// ÁRBOL 3D INTERACTIVO CON THREE.JS
// ============================================

// Variables globales para la escena 3D
let scene, camera, renderer, controls;
let tree, trunk, star;
let ornaments = [];
let snowParticles, sparkleParticles;
let animationId = null;
let isInitialized = false;
let raycaster, mouse;
let starParticles = [];

// Detectar si es móvil
const isMobile = window.innerWidth <= 768;

// Configuración de rendimiento según dispositivo
const PERFORMANCE_CONFIG = {
    snowCount: isMobile ? 200 : 1000,
    sparkleCount: isMobile ? 50 : 300,
    enableShadows: !isMobile,
    ornamentLights: isMobile ? 2 : 6,
    christmasLights: isMobile ? 15 : 30,
    treeSegments: isMobile ? 6 : 8,
    sphereSegments: isMobile ? 16 : 32
};

// Mensajes bonitos para las esferas
const NICE_MESSAGES = [
    "¡Eres la estrella más brillante de nuestra familia! ✨",
    "Tu alegría ilumina cada Navidad 🎄",
    "Gracias por ser parte de esta hermosa familia 💝",
    "Tu sonrisa es el mejor regalo navideño 🎁",
    "Eres la magia que hace especial cada momento ⭐",
    "Tu amor y cariño nos une a todos 💖",
    "Gracias por llenar de alegría nuestras vidas 🌟",
    "Eres un regalo que Dios nos dio 🙏",
    "Tu presencia hace que todo sea más bonito 🌺",
    "Eres el brillo navideño de nuestra familia ✨",
    "Tu corazón es tan grande como el amor que nos das 💕",
    "Gracias por ser tan especial para todos nosotros 🎀",
    "Eres la luz que guía nuestro camino 🕯️",
    "Tu bondad nos inspira cada día 🌈",
    "Eres una bendición en nuestras vidas 🌟"
];

// ============================================
// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ============================================
function initTree3D() {
    console.log('🌲 Iniciando árbol 3D...');
    
    if (isInitialized) {
        console.log('⚠️ Árbol 3D ya inicializado');
        return;
    }

    const container = document.getElementById('tree3DContainer');
    if (!container) {
        console.error('❌ Contenedor tree3DContainer no encontrado');
        return;
    }

    console.log('✅ Contenedor encontrado:', container);
    console.log('📐 Dimensiones:', container.clientWidth, 'x', container.clientHeight);

    // Limpiar contenedor
    container.innerHTML = '';
    
    // Verificar que THREE esté disponible
    if (typeof THREE === 'undefined') {
        console.error('❌ THREE.js no está cargado');
        return;
    }
    console.log('✅ THREE.js cargado correctamente');

    // Crear escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1f29);
    scene.fog = new THREE.Fog(0x0b1f29, 10, 50);

    // Crear cámara (centrada en el árbol)
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    
    // Ajustar distancia según dispositivo
    const cameraDistance = isMobile ? 14 : 10; // Más lejos en móvil
    camera.position.set(0, 3.5, cameraDistance);
    camera.lookAt(0, 3.5, 0);

    // Crear renderer
    renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (PERFORMANCE_CONFIG.enableShadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    container.appendChild(renderer.domElement);
    console.log('✅ Renderer creado y agregado al DOM');

    // Verificar que OrbitControls esté disponible
    if (typeof THREE.OrbitControls === 'undefined') {
        console.error('❌ OrbitControls no está cargado');
        console.log('💡 Intentando usar controles básicos sin OrbitControls');
        controls = null;
    } else {
        // Controles de órbita
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = isMobile ? 10 : 7;
        controls.maxDistance = isMobile ? 25 : 20;
        controls.maxPolarAngle = Math.PI / 2;
        controls.target.set(0, 3.5, 0); // Punto central del árbol
        controls.autoRotate = !isMobile; // Desactivar auto-rotación en móvil
        controls.autoRotateSpeed = 0.5;
        console.log('✅ OrbitControls inicializados');
    }

    // Raycaster para detectar clicks
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Crear luces
    createLights();

    // Crear árbol
    createTree();

    // Crear esferas
    createOrnaments();

    // Crear estrella
    createStar();

    // Crear partículas
    createSnowParticles();
    createSparkleParticles();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onTreeClick);
    renderer.domElement.addEventListener('touchend', onTreeClick);

    // Iniciar animación
    animate();

    isInitialized = true;
    console.log('Árbol 3D inicializado correctamente');
}

// ============================================
// CREACIÓN DE LUCES
// ============================================
function createLights() {
    // Luz ambiente cálida
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Luz direccional principal
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 5);
    if (PERFORMANCE_CONFIG.enableShadows) {
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
    }
    scene.add(directionalLight);

    // Luz puntual dorada (simula la estrella)
    const starLight = new THREE.PointLight(0xffd700, 1, 20);
    starLight.position.set(0, 8, 0);
    scene.add(starLight);

    // Luces de colores navideños
    if (!isMobile) {
        const colors = [0xff0000, 0x00ff00, 0x0000ff];
        colors.forEach((color, i) => {
            const light = new THREE.PointLight(color, 0.3, 10);
            const angle = (i / colors.length) * Math.PI * 2;
            light.position.set(
                Math.cos(angle) * 5,
                3,
                Math.sin(angle) * 5
            );
            scene.add(light);
        });
    }
}

// ============================================
// CREACIÓN DEL ÁRBOL
// ============================================
function createTree() {
    // Tronco
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a2511,
        roughness: 0.8,
        metalness: 0.2
    });
    trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0;
    if (PERFORMANCE_CONFIG.enableShadows) {
        trunk.castShadow = true;
        trunk.receiveShadow = true;
    }
    scene.add(trunk);

    // Cono del árbol (3 niveles)
    const treeGroup = new THREE.Group();
    
    const levels = [
        { radius: 2.5, height: 3, y: 2 },
        { radius: 2, height: 2.5, y: 4 },
        { radius: 1.5, height: 2, y: 6 }
    ];

    levels.forEach(level => {
        const coneGeometry = new THREE.ConeGeometry(level.radius, level.height, PERFORMANCE_CONFIG.treeSegments);
        const coneMaterial = new THREE.MeshStandardMaterial({
            color: 0x0d5c0d,
            roughness: 0.7,
            metalness: 0.1,
            flatShading: true
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.y = level.y;
        if (PERFORMANCE_CONFIG.enableShadows) {
            cone.castShadow = true;
            cone.receiveShadow = true;
        }
        treeGroup.add(cone);
    });

    tree = treeGroup;
    scene.add(tree);
    
    // Agregar luces navideñas al árbol
    createChristmasLights();
}

// ============================================
// CREAR LUCES NAVIDEÑAS EN EL ÁRBOL
// ============================================
function createChristmasLights() {
    const lightColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500];
    const lightsGroup = new THREE.Group();
    
    // Crear guirnalda de luces en espiral alrededor del árbol
    const numLights = PERFORMANCE_CONFIG.christmasLights;
    const spiralTurns = isMobile ? 3 : 4; // Menos vueltas en móvil
    
    for (let i = 0; i < numLights; i++) {
        const t = i / numLights;
        const angle = t * Math.PI * 2 * spiralTurns;
        
        // Altura: de abajo (1.5) a arriba (7)
        const y = 1.5 + t * 5.5;
        
        // Radio: más ancho abajo, más estrecho arriba
        const radius = 2.3 - (t * 1.8);
        
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Crear bombilla
        const bulbGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const color = lightColors[i % lightColors.length];
        const bulbMaterial = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.8,
            roughness: 0.3,
            metalness: 0.5
        });
        
        const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
        bulb.position.set(x, y, z);
        
        // Agregar luz puntual a cada bombilla
        const pointLight = new THREE.PointLight(color, 0.5, 2);
        pointLight.position.copy(bulb.position);
        
        // Guardar datos para animación
        bulb.userData = {
            originalIntensity: 0.8,
            phase: Math.random() * Math.PI * 2,
            light: pointLight
        };
        
        lightsGroup.add(bulb);
        scene.add(pointLight);
    }
    
    scene.add(lightsGroup);
    
    // Guardar referencia para animación
    window.christmasLights = lightsGroup;
}

// ============================================
// CREACIÓN DE ESFERAS NAVIDEÑAS CON USUARIOS
// ============================================
async function createOrnaments() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffd700, 0xff00ff, 0x00ffff, 0xff6b6b, 0x4ecdc4];
    const positions = [
        { x: 1.5, y: 2.5, z: 0 },
        { x: -1.5, y: 2.5, z: 0 },
        { x: 0, y: 2.5, z: 1.5 },
        { x: 1, y: 4, z: 1 },
        { x: -1, y: 4, z: -1 },
        { x: 0.5, y: 5.5, z: 0.5 },
        { x: -0.5, y: 5.5, z: -0.5 },
        { x: 0, y: 3.5, z: -1.5 },
        { x: 1.2, y: 3.2, z: -1 },
        { x: -1.2, y: 3.2, z: 1 }
    ];

    // Cargar usuarios de Supabase
    let users = [];
    try {
        if (typeof supabase !== 'undefined') {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (!error && data) {
                users = data;
                console.log('✅ Usuarios cargados para esferas:', users.length);
            }
        }
    } catch (error) {
        console.log('⚠️ No se pudieron cargar usuarios, usando nombres por defecto');
    }

    // Crear esferas SOLO para usuarios reales
    if (users.length === 0) {
        console.log('⚠️ No hay usuarios registrados, no se crearán esferas');
        return;
    }
    
    const maxOrnaments = Math.min(positions.length, users.length);
    console.log(`🎄 Creando ${maxOrnaments} esferas para ${users.length} usuarios`);
    
    for (let i = 0; i < maxOrnaments; i++) {
        const pos = positions[i];
        const user = users[i];
        
        const geometry = new THREE.SphereGeometry(0.25, PERFORMANCE_CONFIG.sphereSegments, PERFORMANCE_CONFIG.sphereSegments);
        const material = new THREE.MeshStandardMaterial({
            color: colors[i % colors.length],
            roughness: 0.2,
            metalness: 0.8,
            emissive: colors[i % colors.length],
            emissiveIntensity: 0.4
        });
        
        const ornament = new THREE.Mesh(geometry, material);
        ornament.position.set(pos.x, pos.y, pos.z);
        
        if (PERFORMANCE_CONFIG.enableShadows) {
            ornament.castShadow = true;
        }

        // Añadir luz puntual
        if (i < PERFORMANCE_CONFIG.ornamentLights) {
            const light = new THREE.PointLight(colors[i % colors.length], 0.6, 3);
            ornament.add(light);
        }

        // Guardar datos del usuario y animación
        ornament.userData = {
            originalY: pos.y,
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 0.5,
            user: user,
            color: colors[i % colors.length],
            isOrnament: true,
            originalScale: 1
        };

        ornaments.push(ornament);
        scene.add(ornament);
    }
}

// ============================================
// CREACIÓN DE LA ESTRELLA
// ============================================
function createStar() {
    const starShape = new THREE.Shape();
    const outerRadius = 0.5;
    const innerRadius = 0.2;
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
            starShape.moveTo(x, y);
        } else {
            starShape.lineTo(x, y);
        }
    }
    starShape.closePath();

    const extrudeSettings = {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 3
    };

    const geometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0xffd700,
        emissiveIntensity: 0.5
    });

    star = new THREE.Mesh(geometry, material);
    star.position.set(0, 7.5, 0);
    star.rotation.x = 0;
    
    if (PERFORMANCE_CONFIG.enableShadows) {
        star.castShadow = true;
    }

    star.userData = { isInteractive: true };
    scene.add(star);
}

// ============================================
// PARTÍCULAS DE NIEVE
// ============================================
function createSnowParticles() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i < PERFORMANCE_CONFIG.snowCount; i++) {
        vertices.push(
            Math.random() * 40 - 20,
            Math.random() * 20,
            Math.random() * 40 - 20
        );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8
    });

    snowParticles = new THREE.Points(geometry, material);
    scene.add(snowParticles);
}

// ============================================
// PARTÍCULAS DE BRILLO
// ============================================
function createSparkleParticles() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];

    for (let i = 0; i < PERFORMANCE_CONFIG.sparkleCount; i++) {
        const radius = 3 + Math.random() * 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        vertices.push(
            radius * Math.sin(phi) * Math.cos(theta),
            Math.random() * 8,
            radius * Math.sin(phi) * Math.sin(theta)
        );

        const color = new THREE.Color();
        color.setHSL(Math.random(), 1, 0.5);
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        transparent: true,
        opacity: 0.6,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });

    sparkleParticles = new THREE.Points(geometry, material);
    scene.add(sparkleParticles);
}

// ============================================
// PARTÍCULAS DE EXPLOSIÓN (ESTRELLA)
// ============================================
function createStarExplosion() {
    const particleCount = 50;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 4, 4);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(Math.random(), 1, 0.5),
            transparent: true,
            opacity: 1
        });

        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(star.position);

        // Velocidad aleatoria
        const speed = 0.1 + Math.random() * 0.2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        particle.userData = {
            velocity: new THREE.Vector3(
                speed * Math.sin(phi) * Math.cos(theta),
                speed * Math.sin(phi) * Math.sin(theta),
                speed * Math.cos(phi)
            ),
            life: 1.0
        };

        particles.push(particle);
        scene.add(particle);
    }

    starParticles = particles;
}

// ============================================
// DETECCIÓN DE CLICK EN ESTRELLA Y ESFERAS
// ============================================
function onTreeClick(event) {
    event.preventDefault();

    const rect = renderer.domElement.getBoundingClientRect();
    
    if (event.type === 'touchend' && event.changedTouches) {
        mouse.x = ((event.changedTouches[0].clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.changedTouches[0].clientY - rect.top) / rect.height) * 2 + 1;
    } else {
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    raycaster.setFromCamera(mouse, camera);
    
    // Primero verificar esferas
    const ornamentIntersects = raycaster.intersectObjects(ornaments);
    if (ornamentIntersects.length > 0) {
        const clickedOrnament = ornamentIntersects[0].object;
        if (clickedOrnament.userData.isOrnament) {
            showOrnamentModal(clickedOrnament);
            return;
        }
    }
    
    // Luego verificar estrella
    const starIntersects = raycaster.intersectObject(star);
    if (starIntersects.length > 0) {
        console.log('¡Estrella clickeada!');
        createStarExplosion();
        
        // Animación de la estrella
        star.scale.set(1.3, 1.3, 1.3);
        setTimeout(() => {
            star.scale.set(1, 1, 1);
        }, 200);
    }
}

// ============================================
// MOSTRAR MODAL DE ESFERA CON 3D REAL
// ============================================
function showOrnamentModal(ornament) {
    const user = ornament.userData.user;
    const color = ornament.userData.color;
    
    // Animar esfera (agrandar)
    ornament.scale.set(1.5, 1.5, 1.5);
    setTimeout(() => {
        ornament.scale.set(1, 1, 1);
    }, 300);
    
    // Obtener mensaje bonito (guardado o nuevo)
    const savedMessages = JSON.parse(localStorage.getItem('tree3DMessages') || '{}');
    let message = savedMessages[user.id];
    
    if (!message) {
        message = NICE_MESSAGES[Math.floor(Math.random() * NICE_MESSAGES.length)];
        savedMessages[user.id] = message;
        localStorage.setItem('tree3DMessages', JSON.stringify(savedMessages));
    }
    
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'ornament-modal';
    modal.innerHTML = `
        <div class="ornament-modal-overlay"></div>
        <div class="ornament-modal-content">
            <button class="ornament-modal-close">×</button>
            <div class="ornament-modal-header">
                <div id="modalSphere3D" class="ornament-modal-sphere-3d"></div>
                <h3 class="ornament-modal-name">${user.name || 'Familia'}</h3>
            </div>
            <div class="ornament-modal-message">
                <p>${message}</p>
            </div>
            <div class="ornament-modal-footer">
                <p class="ornament-modal-date">🎄 Navidad ${new Date().getFullYear()}</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Crear esfera 3D en el modal
    setTimeout(() => {
        createModalSphere(color, user.name);
    }, 50);
    
    // Animar entrada
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Cerrar modal
    const closeModal = () => {
        modal.classList.remove('show');
        destroyModalSphere();
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.ornament-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.ornament-modal-overlay').addEventListener('click', closeModal);
}

// Variables para la esfera del modal
let modalScene, modalCamera, modalRenderer, modalSphere, modalAnimationId, modalControls;
let modalGroup; // Grupo para rotar todo junto

// Crear esfera 3D en el modal
function createModalSphere(color, userName) {
    const container = document.getElementById('modalSphere3D');
    if (!container) return;
    
    // Crear escena del modal
    modalScene = new THREE.Scene();
    
    // Crear cámara
    const aspect = 1; // Contenedor cuadrado
    modalCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    modalCamera.position.set(0, 0.2, 3.5);
    modalCamera.lookAt(0, 0.2, 0);
    
    // Crear renderer
    modalRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    modalRenderer.setSize(200, 200);
    modalRenderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(modalRenderer.domElement);
    
    // Crear grupo para contener esfera y texto
    modalGroup = new THREE.Group();
    modalGroup.position.y = -0.1; // Bajar ligeramente para centrar mejor con el colgante
    modalScene.add(modalGroup);
    
    // Crear esfera base (bola de navidad)
    const geometry = new THREE.SphereGeometry(0.8, 64, 64);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.1,
        metalness: 0.9,
        emissive: color,
        emissiveIntensity: 0.15,
        envMapIntensity: 1
    });
    
    modalSphere = new THREE.Mesh(geometry, material);
    modalGroup.add(modalSphere);
    
    // Crear colgante/gancho superior
    const hookGroup = new THREE.Group();
    
    // Base del gancho (cilindro pequeño)
    const hookBaseGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 16);
    const hookBaseMaterial = new THREE.MeshStandardMaterial({
        color: 0xc0c0c0,
        metalness: 0.9,
        roughness: 0.1
    });
    const hookBase = new THREE.Mesh(hookBaseGeometry, hookBaseMaterial);
    hookBase.position.y = 0.88;
    hookGroup.add(hookBase);
    
    // Anillo del gancho (torus)
    const ringGeometry = new THREE.TorusGeometry(0.12, 0.03, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.95,
        roughness: 0.05
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 1.0;
    ring.rotation.x = Math.PI / 2;
    hookGroup.add(ring);
    
    modalGroup.add(hookGroup);
    
    // Crear brillo/reflejo en la esfera (mejor posicionado)
    const shineGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const shineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4
    });
    const shine = new THREE.Mesh(shineGeometry, shineMaterial);
    shine.position.set(-0.4, 0.4, 0.6);
    modalGroup.add(shine);
    
    // Crear textura con el nombre para mapear en la esfera
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    
    // Fondo transparente
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar nombre con estilo navideño
    context.fillStyle = 'rgba(255, 255, 255, 1)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    context.lineWidth = 4;
    context.font = 'bold 52px "Mountains of Christmas", cursive, Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Dibujar el nombre en el centro con sombra
    const centerY = canvas.height / 2;
    context.shadowColor = 'rgba(0, 0, 0, 0.5)';
    context.shadowBlur = 10;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    context.strokeText(userName, canvas.width / 2, centerY);
    context.fillText(userName, canvas.width / 2, centerY);
    
    // Crear textura y aplicarla a la esfera
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    
    // Crear material con la textura del nombre
    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    // Crear esfera de texto superpuesta
    const textGeometry = new THREE.SphereGeometry(0.81, 64, 64);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    modalGroup.add(textMesh);
    
    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    modalScene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(color, 1.2, 10);
    pointLight.position.set(2, 2, 2);
    modalScene.add(pointLight);
    
    const pointLight2 = new THREE.PointLight(0xffffff, 0.8, 10);
    pointLight2.position.set(-2, -1, 2);
    modalScene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0xffffff, 0.5, 10);
    pointLight3.position.set(0, -2, -2);
    modalScene.add(pointLight3);
    
    // Agregar partículas de nieve alrededor
    const snowGeometry = new THREE.BufferGeometry();
    const snowVertices = [];
    for (let i = 0; i < 50; i++) {
        snowVertices.push(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );
    }
    snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(snowVertices, 3));
    const snowMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.6
    });
    const snowParticlesModal = new THREE.Points(snowGeometry, snowMaterial);
    modalScene.add(snowParticlesModal);
    
    // Agregar OrbitControls para el modal
    if (typeof THREE.OrbitControls !== 'undefined') {
        modalControls = new THREE.OrbitControls(modalCamera, modalRenderer.domElement);
        modalControls.enableDamping = true;
        modalControls.dampingFactor = 0.05;
        modalControls.enableZoom = false;
        modalControls.enablePan = false;
        modalControls.target.set(0, 0.2, 0); // Centrar en la bola
        modalControls.autoRotate = true;
        modalControls.autoRotateSpeed = 2;
        modalControls.update();
    }
    
    // Animar esfera del modal
    function animateModalSphere() {
        modalAnimationId = requestAnimationFrame(animateModalSphere);
        
        // Actualizar controles si existen
        if (modalControls) {
            modalControls.update();
        } else {
            // Rotación automática si no hay controles
            if (modalGroup) {
                modalGroup.rotation.y += 0.01;
            }
        }
        
        // Animar partículas de nieve
        if (snowParticlesModal) {
            snowParticlesModal.rotation.y += 0.002;
            const positions = snowParticlesModal.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] -= 0.01;
                if (positions[i] < -2) {
                    positions[i] = 2;
                }
            }
            snowParticlesModal.geometry.attributes.position.needsUpdate = true;
        }
        
        if (modalRenderer && modalScene && modalCamera) {
            modalRenderer.render(modalScene, modalCamera);
        }
    }
    
    animateModalSphere();
}

// Destruir esfera del modal
function destroyModalSphere() {
    if (modalAnimationId) {
        cancelAnimationFrame(modalAnimationId);
        modalAnimationId = null;
    }
    
    if (modalControls) {
        modalControls.dispose();
        modalControls = null;
    }
    
    if (modalScene) {
        modalScene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => {
                        if (mat.map) mat.map.dispose();
                        mat.dispose();
                    });
                } else {
                    if (object.material.map) object.material.map.dispose();
                    object.material.dispose();
                }
            }
        });
    }
    
    if (modalRenderer) {
        modalRenderer.dispose();
        const container = document.getElementById('modalSphere3D');
        if (container && modalRenderer.domElement) {
            container.removeChild(modalRenderer.domElement);
        }
    }
    
    modalScene = null;
    modalCamera = null;
    modalRenderer = null;
    modalSphere = null;
    modalGroup = null;
}

// Convertir color THREE.js a hex
function getColorHex(color) {
    return '#' + color.toString(16).padStart(6, '0');
}

// ============================================
// ANIMACIÓN PRINCIPAL
// ============================================
function animate() {
    animationId = requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // Animar esferas (oscilación)
    ornaments.forEach(ornament => {
        ornament.position.y = ornament.userData.originalY + 
            Math.sin(time * ornament.userData.speed + ornament.userData.phase) * 0.1;
        ornament.rotation.y += 0.01;
    });

    // Animar estrella
    if (star) {
        star.rotation.z += 0.01;
        star.position.y = 7.5 + Math.sin(time * 2) * 0.1;
    }

    // Animar nieve
    if (snowParticles) {
        const positions = snowParticles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 0.02;
            if (positions[i] < 0) {
                positions[i] = 20;
            }
        }
        snowParticles.geometry.attributes.position.needsUpdate = true;
        snowParticles.rotation.y += 0.0005;
    }

    // Animar partículas de brillo
    if (sparkleParticles) {
        sparkleParticles.rotation.y += 0.001;
        const positions = sparkleParticles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += Math.sin(time + i) * 0.01;
        }
        sparkleParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Animar partículas de explosión
    starParticles.forEach((particle, index) => {
        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.y -= 0.005; // Gravedad
        particle.userData.life -= 0.02;
        particle.material.opacity = particle.userData.life;

        if (particle.userData.life <= 0) {
            scene.remove(particle);
            starParticles.splice(index, 1);
        }
    });

    // Animar luces navideñas (parpadeo)
    if (window.christmasLights) {
        window.christmasLights.children.forEach(bulb => {
            if (bulb.userData.originalIntensity) {
                const intensity = bulb.userData.originalIntensity + 
                    Math.sin(time * 3 + bulb.userData.phase) * 0.3;
                bulb.material.emissiveIntensity = Math.max(0.3, intensity);
                
                // Actualizar intensidad de la luz asociada
                if (bulb.userData.light) {
                    bulb.userData.light.intensity = Math.max(0.2, intensity * 0.6);
                }
            }
        });
    }

    // Actualizar controles
    if (controls) {
        controls.update();
    }

    // Renderizar
    renderer.render(scene, camera);
}

// ============================================
// RESIZE
// ============================================
function onWindowResize() {
    const container = document.getElementById('tree3DContainer');
    if (!container || !camera || !renderer) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// ============================================
// DESTRUIR ESCENA (CLEANUP)
// ============================================
function destroyTree3D() {
    if (!isInitialized) return;

    console.log('Destruyendo árbol 3D...');

    // Cancelar animación
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // Remover event listeners
    window.removeEventListener('resize', onWindowResize);
    if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('click', onTreeClick);
        renderer.domElement.removeEventListener('touchend', onTreeClick);
    }

    // Limpiar geometrías y materiales
    scene.traverse((object) => {
        if (object.geometry) {
            object.geometry.dispose();
        }
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
    });

    // Limpiar renderer
    if (renderer) {
        renderer.dispose();
        const container = document.getElementById('tree3DContainer');
        if (container && renderer.domElement) {
            container.removeChild(renderer.domElement);
        }
    }

    // Limpiar controles
    if (controls) {
        controls.dispose();
    }

    // Resetear variables
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    tree = null;
    trunk = null;
    star = null;
    ornaments = [];
    snowParticles = null;
    sparkleParticles = null;
    starParticles = [];
    raycaster = null;
    mouse = null;

    isInitialized = false;
    console.log('Árbol 3D destruido correctamente');
}
