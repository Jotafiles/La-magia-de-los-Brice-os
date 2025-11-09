// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================

// ⚠️ IMPORTANTE: Reemplaza estos valores con tus credenciales de Supabase
// Puedes obtenerlas en: https://supabase.com/dashboard/project/_/settings/api

const SUPABASE_URL = 'https://kkunaeyytwrrvhgnjkme.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdW5hZXl5dHdycnZoZ25qa21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODc1OTYsImV4cCI6MjA3ODI2MzU5Nn0.LNxUFT9cPTurhF1CY47QPPy_QnOgZW9eH0Z9DXo2mEY';

// Crear cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// FUNCIONES DE BASE DE DATOS
// ============================================

/**
 * Estructura de tablas necesarias en Supabase:
 * 
 * 1. Tabla: users
 *    - id (uuid, primary key, default: uuid_generate_v4())
 *    - email (text, unique)
 *    - name (text)
 *    - password_hash (text) - En producción usar auth de Supabase
 *    - role (text, default: 'participant') - 'admin' o 'participant'
 *    - avatar (text, default: '🎅')
 *    - created_at (timestamp, default: now())
 * 
 * 2. Tabla: draw_results
 *    - id (uuid, primary key, default: uuid_generate_v4())
 *    - giver_id (uuid, foreign key -> users.id)
 *    - receiver_id (uuid, foreign key -> users.id)
 *    - revealed_at (timestamp)
 *    - created_at (timestamp, default: now())
 * 
 * 3. Tabla: notifications
 *    - id (uuid, primary key, default: uuid_generate_v4())
 *    - type (text) - 'info', 'success', 'warning', 'funny'
 *    - title (text)
 *    - message (text)
 *    - icon (text)
 *    - created_at (timestamp, default: now())
 * 
 * 4. Tabla: photos (opcional para futuras funciones)
 *    - id (uuid, primary key, default: uuid_generate_v4())
 *    - url (text)
 *    - author_id (uuid, foreign key -> users.id)
 *    - description (text)
 *    - created_at (timestamp, default: now())
 */

// ============================================
// SQL PARA CREAR TABLAS
// ============================================

/**
 * Ejecuta estos comandos en el SQL Editor de Supabase:
 * 
 * -- Tabla de usuarios
 * CREATE TABLE users (
 *   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   email text UNIQUE NOT NULL,
 *   name text NOT NULL,
 *   password_hash text NOT NULL,
 *   role text DEFAULT 'participant',
 *   avatar text DEFAULT '🎅',
 *   created_at timestamp DEFAULT now()
 * );
 * 
 * -- Tabla de resultados del sorteo
 * CREATE TABLE draw_results (
 *   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   giver_id uuid REFERENCES users(id) ON DELETE CASCADE,
 *   receiver_id uuid REFERENCES users(id) ON DELETE CASCADE,
 *   revealed_at timestamp,
 *   created_at timestamp DEFAULT now(),
 *   UNIQUE(giver_id)
 * );
 * 
 * -- Tabla de notificaciones
 * CREATE TABLE notifications (
 *   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   type text NOT NULL,
 *   title text NOT NULL,
 *   message text NOT NULL,
 *   icon text DEFAULT '🔔',
 *   created_at timestamp DEFAULT now()
 * );
 * 
 * -- Tabla de fotos (opcional)
 * CREATE TABLE photos (
 *   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   url text NOT NULL,
 *   author_id uuid REFERENCES users(id) ON DELETE CASCADE,
 *   description text,
 *   created_at timestamp DEFAULT now()
 * );
 * 
 * -- Habilitar Row Level Security (RLS)
 * ALTER TABLE users ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE draw_results ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
 * 
 * -- Políticas para users (lectura pública)
 * CREATE POLICY "Users are viewable by everyone" ON users
 *   FOR SELECT USING (true);
 * 
 * CREATE POLICY "Users can insert themselves" ON users
 *   FOR INSERT WITH CHECK (true);
 * 
 * -- Políticas para draw_results
 * CREATE POLICY "Draw results are viewable by everyone" ON draw_results
 *   FOR SELECT USING (true);
 * 
 * CREATE POLICY "Only admins can insert draw results" ON draw_results
 *   FOR INSERT WITH CHECK (true);
 * 
 * CREATE POLICY "Anyone can update their revealed_at" ON draw_results
 *   FOR UPDATE USING (true);
 * 
 * -- Políticas para notifications (lectura pública)
 * CREATE POLICY "Notifications are viewable by everyone" ON notifications
 *   FOR SELECT USING (true);
 * 
 * CREATE POLICY "Anyone can insert notifications" ON notifications
 *   FOR INSERT WITH CHECK (true);
 * 
 * -- Políticas para photos
 * CREATE POLICY "Photos are viewable by everyone" ON photos
 *   FOR SELECT USING (true);
 * 
 * CREATE POLICY "Anyone can insert photos" ON photos
 *   FOR INSERT WITH CHECK (true);
 * 
 * -- Crear índices para mejorar el rendimiento
 * CREATE INDEX idx_users_email ON users(email);
 * CREATE INDEX idx_draw_results_giver ON draw_results(giver_id);
 * CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
 */

// ============================================
// DATOS DE PRUEBA (OPCIONAL)
// ============================================

/**
 * Puedes insertar estos datos de prueba usando el SQL Editor:
 * 
 * INSERT INTO users (email, name, password_hash, role, avatar) VALUES
 *   ('admin@navidad.com', 'Organizador', 'hash123', 'admin', '🎅'),
 *   ('tio.lucho@familia.com', 'Tío Lucho el Parrillero', 'hash123', 'participant', '🧔'),
 *   ('prima.drama@familia.com', 'Prima Drama Queen', 'hash123', 'participant', '👸'),
 *   ('abuela.cocinera@familia.com', 'Abuela la Cocinera', 'hash123', 'participant', '👵'),
 *   ('primo.gamer@familia.com', 'Primo el Gamer', 'hash123', 'participant', '🎮'),
 *   ('tia.chistosa@familia.com', 'Tía la Chistosa', 'hash123', 'participant', '😂');
 * 
 * INSERT INTO notifications (type, title, message, icon) VALUES
 *   ('info', '¡Bienvenidos!', 'La aplicación está lista para el sorteo navideño', '🎄'),
 *   ('funny', 'Consejo del día', 'No olvides envolver tu regalo con cariño (y cinta adhesiva)', '🎁'),
 *   ('warning', 'Recordatorio', 'El sorteo se realizará el 24 de diciembre', '⏰');
 */

// ============================================
// HELPER: Hash simple de contraseña
// ============================================
// NOTA: En producción, usa la autenticación nativa de Supabase Auth
// Esta es una versión simplificada solo para demostración

async function hashPassword(password) {
    // Simple hash usando btoa (NO usar en producción real)
    return btoa(password + 'navidad-salt-2024');
}

async function verifyPassword(password, hash) {
    const hashed = await hashPassword(password);
    return hashed === hash;
}

// Exportar funciones para uso global
window.supabaseConfig = {
    client: supabase,
    hashPassword,
    verifyPassword
};
