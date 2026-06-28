import './style.css'
import { sb } from './supabase.js'
import { state, loadProfile, isAdmin, isGestor } from './state.js'
import { route, notFound, navigate, startRouter } from './router.js'
import { renderLogin } from './pages/login.js'
import { renderDashboard } from './pages/dashboard.js'
import { renderInstituicoes } from './pages/instituicoes.js'
import { renderVisitas } from './pages/visitas.js'
import { renderUsuarios } from './pages/usuarios.js'
import { renderValidacao } from './pages/validacao.js'

async function boot() {
  const { data: { session } } = await sb.auth.getSession()

  if (session) {
    state.user = session.user
    await loadProfile(session.user.id)
  }

  // Rotas protegidas
  route('/', () => {
    if (!state.user) { renderLogin(); return }
    renderDashboard()
  })

  route('/instituicoes', () => {
    if (!state.user) { renderLogin(); return }
    renderInstituicoes()
  })

  route('/visitas', () => {
    if (!state.user) { renderLogin(); return }
    renderVisitas()
  })

  route('/usuarios', () => {
    if (!state.user) { renderLogin(); return }
    if (!isAdmin()) { navigate('/'); return }
    renderUsuarios()
  })

  route('/validacao', () => {
    if (!state.user) { renderLogin(); return }
    if (!isGestor()) { navigate('/'); return }
    renderValidacao()
  })

  notFound(() => navigate('/'))

  startRouter()

  // Reage a login/logout
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      state.user = session.user
      await loadProfile(session.user.id)
      navigate('/')
    }
    if (event === 'SIGNED_OUT') {
      state.user = null
      state.profile = null
      navigate('/')
    }
  })
}

boot()
