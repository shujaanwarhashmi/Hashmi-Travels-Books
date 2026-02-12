import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wchknymamgcngxcdjrtp.supabase.co';
const supabaseKey = 'sb_publishable_kwcjX1bA4czzuQRMSbAYlQ_AvQAA7bd';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});