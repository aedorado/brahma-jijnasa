import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Generates a unique 4-digit PIN (1000-9999) that is guaranteed
 * not to collide with any currently active session in quiz_sessions.
 */
export async function generateUniqueActivePin(supabase: SupabaseClient): Promise<string> {
  // 1. Fetch all currently active PINs from the database
  const { data: activeSessions } = await supabase
    .from('quiz_sessions')
    .select('pin')
    .eq('is_active', true)

  const activePins = new Set<string>()
  if (activeSessions) {
    for (const s of activeSessions) {
      if (s.pin) activePins.add(String(s.pin))
    }
  }

  // Reserved demo pins
  activePins.add('000')
  activePins.add('0000')

  // 2. Try random generation up to 100 times
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000))
    if (!activePins.has(candidate)) {
      return candidate
    }
  }

  // 3. Fallback: Systematic scan from 1000 to 9999
  for (let candidateNum = 1000; candidateNum <= 9999; candidateNum++) {
    const candidate = String(candidateNum)
    if (!activePins.has(candidate)) {
      return candidate
    }
  }

  throw new Error('All 4-digit PINs are currently occupied by active sessions.')
}
