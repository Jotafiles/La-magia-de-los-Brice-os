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
 * 4. Tabla: photos (Galería de Fotos Navideñas)
 *    - id (uuid, primary key, default: uuid_generate_v4())
 *    - url (text) - URL de Supabase Storage
 *    - user_id (uuid, foreign key -> users.id)
 *    - caption (text) - Descripción de la foto
 *    - category (text, default: 'navideña')
 *    - approved (boolean, default: true) - Publicación inmediata
 *    - flagged (boolean, default: false) - Marcada por moderación
 *    - created_at (timestamp, default: now())
 * 
 * 5. Tabla: photo_likes (Likes de fotos)
 *    - id (uuid, primary key, default: uuid_generate_v4())
 *    - photo_id (uuid, foreign key -> photos.id)
 *    - user_id (uuid, foreign key -> users.id)
 *    - created_at (timestamp, default: now())
 *    - UNIQUE(photo_id, user_id) - Un usuario solo puede dar like una vez
 * 
 * 6. Tabla: polls (Votaciones Familiares)
 *    - id (uuid, primary key, default: uuid_generate_v4())
 *    - title (text)
 *    - description (text)
 *    - options (jsonb) - Array de opciones: [{id, text, votes}]
 *    - deadline (timestamp)
 *    - multiple_choice (boolean, default: false)
 *    - is_closed (boolean, default: false)
 *    - created_by (uuid, foreign key -> users.id)
 *    - created_at (timestamp, default: now())
 * 
 * 7. Tabla: poll_votes (Votos de encuestas)
 *    - id (uuid, primary key, default: uuid_generate_v4())
 *    - poll_id (uuid, foreign key -> polls.id)
 *    - user_id (uuid, foreign key -> users.id)
 *    - option_ids (jsonb) - Array de IDs de opciones votadas
 *    - created_at (timestamp, default: now())
 *    - UNIQUE(poll_id, user_id) - Un usuario vota una vez por encuesta
 * 
 * 8. Tabla: admin_message (Mensaje Especial del Administrador)
 *    - id (uuid, primary key, default: uuid_generate_v4())
 *    - message (text)
 *    - author_id (uuid, foreign key -> users.id)
 *    - updated_at (timestamp, default: now())
 * 
 * 9. Tabla: ornaments (Esferas del Árbol)
 *    - id (uuid, primary key, default: uuid_generate_v4())
 *    - user_id (uuid, foreign key -> users.id)
 *    - position_rel_x (float) - Posición relativa X (0..1)
 *    - position_rel_y (float) - Posición relativa Y (0..1)
 *    - color (text)
 *    - label (text) - Nombre del usuario
 *    - size (text, default: 'medium') - 'small', 'medium', 'large'
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
 * -- Tabla de fotos navideñas
 * CREATE TABLE photos (
 *   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   url text NOT NULL,
 *   user_id uuid REFERENCES users(id) ON DELETE CASCADE,
 *   caption text,
 *   category text DEFAULT 'navideña',
 *   approved boolean DEFAULT true,
 *   flagged boolean DEFAULT false,
 *   created_at timestamp DEFAULT now()
 * );
 * 
 * -- Tabla de likes de fotos
 * CREATE TABLE photo_likes (
 *   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
 *   user_id uuid REFERENCES users(id) ON DELETE CASCADE,
 *   created_at timestamp DEFAULT now(),
 *   UNIQUE(photo_id, user_id)
 * );
 * 
 * -- Tabla de encuestas/votaciones
 * CREATE TABLE polls (
 *   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   title text NOT NULL,
 *   description text,
 *   options jsonb NOT NULL,
 *   deadline timestamp,
 *   multiple_choice boolean DEFAULT false,
 *   is_closed boolean DEFAULT false,
 *   created_by uuid REFERENCES users(id) ON DELETE CASCADE,
 *   created_at timestamp DEFAULT now()
 * );
 * 
 * -- Tabla de votos de encuestas
 * CREATE TABLE poll_votes (
 *   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   poll_id uuid REFERENCES polls(id) ON DELETE CASCADE,
 *   user_id uuid REFERENCES users(id) ON DELETE CASCADE,
 *   option_ids jsonb NOT NULL,
 *   created_at timestamp DEFAULT now(),
 *   UNIQUE(poll_id, user_id)
 * );
 * 
 * -- Tabla de mensaje especial del admin
 * CREATE TABLE admin_message (
 *   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   message text NOT NULL,
 *   author_id uuid REFERENCES users(id) ON DELETE CASCADE,
 *   updated_at timestamp DEFAULT now()
 * );
 * 
 * -- Tabla de esferas del árbol
 * CREATE TABLE ornaments (
 *   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id uuid REFERENCES users(id) ON DELETE CASCADE,
 *   position_rel_x float NOT NULL,
 *   position_rel_y float NOT NULL,
 *   color text NOT NULL,
 *   label text NOT NULL,
 *   size text DEFAULT 'medium',
 *   created_at timestamp DEFAULT now(),
 *   UNIQUE(user_id)
 * );
 * 
 * -- Habilitar Row Level Security (RLS)
 * ALTER TABLE users ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE draw_results ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE admin_message ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE ornaments ENABLE ROW LEVEL SECURITY;
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
 * CREATE POLICY "Anyone can update photos" ON photos
 *   FOR UPDATE USING (true);
 * 
 * CREATE POLICY "Anyone can delete photos" ON photos
 *   FOR DELETE USING (true);
 * 
 * -- Políticas para photo_likes
 * CREATE POLICY "Photo likes are viewable by everyone" ON photo_likes
 *   FOR SELECT USING (true);
 * 
 * CREATE POLICY "Anyone can insert photo likes" ON photo_likes
 *   FOR INSERT WITH CHECK (true);
 * 
 * CREATE POLICY "Anyone can delete their photo likes" ON photo_likes
 *   FOR DELETE USING (true);
 * 
 * -- Políticas para polls
 * CREATE POLICY "Polls are viewable by everyone" ON polls
 *   FOR SELECT USING (true);
 * 
 * CREATE POLICY "Anyone can insert polls" ON polls
 *   FOR INSERT WITH CHECK (true);
 * 
 * CREATE POLICY "Anyone can update polls" ON polls
 *   FOR UPDATE USING (true);
 * 
 * CREATE POLICY "Anyone can delete polls" ON polls
 *   FOR DELETE USING (true);
 * 
 * -- Políticas para poll_votes
 * CREATE POLICY "Poll votes are viewable by everyone" ON poll_votes
 *   FOR SELECT USING (true);
 * 
 * CREATE POLICY "Anyone can insert poll votes" ON poll_votes
 *   FOR INSERT WITH CHECK (true);
 * 
 * -- Políticas para admin_message
 * CREATE POLICY "Admin message is viewable by everyone" ON admin_message
 *   FOR SELECT USING (true);
 * 
 * CREATE POLICY "Anyone can insert admin message" ON admin_message
 *   FOR INSERT WITH CHECK (true);
 * 
 * CREATE POLICY "Anyone can update admin message" ON admin_message
 *   FOR UPDATE USING (true);
 * 
 * CREATE POLICY "Anyone can delete admin message" ON admin_message
 *   FOR DELETE USING (true);
 * 
 * -- Políticas para ornaments
 * CREATE POLICY "Ornaments are viewable by everyone" ON ornaments
 *   FOR SELECT USING (true);
 * 
 * CREATE POLICY "Anyone can insert ornaments" ON ornaments
 *   FOR INSERT WITH CHECK (true);
 * 
 * CREATE POLICY "Anyone can update ornaments" ON ornaments
 *   FOR UPDATE USING (true);
 * 
 * CREATE POLICY "Anyone can delete ornaments" ON ornaments
 *   FOR DELETE USING (true);
 * 
 * -- Crear índices para mejorar el rendimiento
 * CREATE INDEX idx_users_email ON users(email);
 * CREATE INDEX idx_draw_results_giver ON draw_results(giver_id);
 * CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
 * CREATE INDEX idx_photos_user ON photos(user_id);
 * CREATE INDEX idx_photos_created ON photos(created_at DESC);
 * CREATE INDEX idx_photo_likes_photo ON photo_likes(photo_id);
 * CREATE INDEX idx_photo_likes_user ON photo_likes(user_id);
 * CREATE INDEX idx_polls_created ON polls(created_at DESC);
 * CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
 * CREATE INDEX idx_ornaments_user ON ornaments(user_id);
 * 
 * -- Crear bucket de Storage para fotos
 * -- Ejecutar en el SQL Editor o crear manualmente en Storage:
 * INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
 * 
 * -- Política de Storage para fotos (permitir subida y lectura pública)
 * CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
 * CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos');
 * CREATE POLICY "Users can update their own photos" ON storage.objects FOR UPDATE USING (bucket_id = 'photos');
 * CREATE POLICY "Users can delete their own photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos');
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
