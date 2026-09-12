import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lgjzqjgvcmylrebhjgdy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnanpxamd2Y215bHJlYmhqZ2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NDY5NTUsImV4cCI6MjEwMjAyMjk1NX0.HxVyU1jic3Cgh-my2o1IH4lKlVZRpNW7uMuz2v4h-Nc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);