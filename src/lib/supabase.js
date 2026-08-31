import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yfuxlbvvrsecmwewhtzh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmdXhsYnZ2cnNlY213ZXdodHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTE1ODUsImV4cCI6MjEwMzc2NzU4NX0.lj4-m6wGSJOAOMA8ymrqi4ypvJKVR821b3-i5Ddi3cw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
