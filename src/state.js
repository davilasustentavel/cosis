import { sb } from './supabase.js'

export const state = {
  user: null,
  profile: null,
}

export async function loadProfile(userId) {
  const { data } = await sb.from('usuarios').select('*').eq('id', userId).single()
  state.profile = data
  return data
}

export function isAdmin() {
  return state.profile?.perfil === 'admin'
}

export function isGestor() {
  return state.profile?.perfil === 'admin' || state.profile?.perfil === 'gestor'
}

export function perfilLabel() {
  const map = { admin: 'Administrador', gestor: 'Gestor', campo: 'Campo' }
  return map[state.profile?.perfil] ?? state.profile?.perfil ?? ''
}
