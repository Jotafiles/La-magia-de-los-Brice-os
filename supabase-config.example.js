// ============================================
// ARCHIVO DE EJEMPLO - CONFIGURACIÓN DE SUPABASE
// ============================================
// Copia este archivo como "supabase-config.js" y completa con tus datos

// ⚠️ IMPORTANTE: Obtén estas credenciales desde:
// https://supabase.com/dashboard/project/_/settings/api

const SUPABASE_URL = 'https://tuproyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-clave-anonima-muy-larga-aqui';

// No modifiques nada de aquí hacia abajo
// ============================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function hashPassword(password) {
    return btoa(password + 'navidad-salt-2024');
}

async function verifyPassword(password, hash) {
    const hashed = await hashPassword(password);
    return hashed === hash;
}

window.supabaseConfig = {
    client: supabase,
    hashPassword,
    verifyPassword
};
