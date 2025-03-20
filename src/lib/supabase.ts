import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Hardcoded values to bypass environment variable caching issues
const supabaseUrl = "https://iclykjoebzsbfnaqxwve.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljbHlram9lYnpzYmZuYXF4d3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwMDk5NTMsImV4cCI6MjA1NTU4NTk1M30.mUZTP8c1IOF71juBg8xDrz1bkRZAzwY0hIgOUk07Rp0";

console.log(
  "Using hardcoded Supabase credentials to bypass env variable caching",
);
console.log("Supabase URL:", supabaseUrl);
console.log(
  "Supabase Key (first 10 chars):",
  supabaseAnonKey.substring(0, 10) + "...",
);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
