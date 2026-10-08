import { createClient } from "@supabase/supabase-js";

// Only the panel (/panel) loads this. It carries the publishable key and is used for the session and for
// uploading photos to a signed address; every read and write of data still goes through the /api routes.
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined,key=import.meta.env.VITE_SUPABASE_KEY as string|undefined;

export const supabaseReady=Boolean(url&&key);
export const supabase=createClient(url||"https://missing.supabase.co",key||"missing");
