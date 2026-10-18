import { createClient } from "@supabase/supabase-js";

// Only the panel (/panel) loads this. It is used for the session and for uploading photos to a signed address;
// every read and write of data still goes through the /api routes.
// Both values are public by design: the publishable key ships to every browser and only grants what the
// row level security policies allow. They live here so the panel needs no setup; VITE_SUPABASE_URL and
// VITE_SUPABASE_KEY override them when pointing at another project. Never put the service_role key here.
const url=import.meta.env.VITE_SUPABASE_URL||"https://gqjqlcexlztecjnwxqjx.supabase.co";
const key=import.meta.env.VITE_SUPABASE_KEY||"sb_publishable_Er0y2BqN0a8LK-T6XDuyXQ_3KEk1fRk";

export const supabase=createClient(url,key);
