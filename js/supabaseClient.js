import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'
// supabase-js é carregado via CDN no index.html e exposto como window.supabase
export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
