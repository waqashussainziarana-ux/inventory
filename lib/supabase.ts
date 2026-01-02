
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://einilxwsgjrpuhvpsipe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbmlseHdzZ2pycHVodnBzaXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjc0NDIsImV4cCI6MjA3NzYwMzQ0Mn0.mjHXBDaOzovXuIybQze59Bg4UB3yyMmvlmJknqA1o_8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
