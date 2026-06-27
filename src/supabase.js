import { createClient } from '@supabase/supabase-js'

const SUPA_URL = 'https://cxexqqakivuzuxpvsbbw.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZXhxcWFraXZ1enV4cHZzYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTM1NTAsImV4cCI6MjA5NzQ2OTU1MH0.Na1mwQbBPCBpAPauhlFc7_A6XtAgnby25HOIPGq5l3M'

export const sb = createClient(SUPA_URL, SUPA_KEY)
export { SUPA_URL, SUPA_KEY }
