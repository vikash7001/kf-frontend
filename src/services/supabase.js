import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tqimpcglvqbiymqcdlvl.supabase.co";
const supabaseKey = "sb_publishable_CCs8GFz6SF06OIVMb4SU8g_edr8cZQQ"; // 🔥 replace this

export const supabase = createClient(supabaseUrl, supabaseKey);