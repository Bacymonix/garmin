// Réglages publics de l'app. La clé « anon » de Supabase est faite pour être publique :
// ce sont les règles de sécurité de la base (schema.sql) qui protègent tes données.
window.COCKPIT_CONFIG = {
  supabaseUrl: 'https://bxmnmfcyzhbtjzjyijhs.supabase.co',        // ex. https://abcdefgh.supabase.co
  supabaseAnonKey: 'sb_publishable_PNO_EMRJPj3qcf7obPEoug_brHz39Cg',    // Supabase › Project Settings › API Keys › anon / publishable
  githubRepo: 'Bacymonix/cockpit',
  workflow: 'garmin-sync.yml'
};
