import { supabase } from '../lib/supabaseClient.js';
import { failWith } from './serviceError.js';

/**
 * Display name of a seller. Profiles are readable only by logged-in users, so for
 * a visitor this resolves to null (the UI then asks them to log in to see it).
 */
export async function fetchSellerName(sellerId) {
  if (!supabase || !sellerId) return null;
  const { data, error } = await supabase.from('profiles').select('full_name').eq('id', sellerId).maybeSingle();
  if (error) throw failWith(error, 'Could not load the seller.');
  return data?.full_name?.trim() || null;
}
