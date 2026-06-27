import { sb } from './supabase.js'
import { state, isAdmin, isGestor, perfilLabel } from './state.js'
import { navigate } from './router.js'

export function renderLayout(activeKey) {
  const nome = state.profile?.nome ?? state.user?.email ?? '—'
  const initials = nome.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
  const perfil = state.profile?.perfil ?? 'campo'
  const badgeClass = `badge badge-${perfil}`

  const navItems = [
    { key: 'dashboard',    icon: '🏠', label: 'Início',       path: '#/' },
    { key: 'instituicoes', icon: '🏫', label: 'Instituições', path: '#/instituicoes' },
    { key: 'visitas',      icon: '📋', label: 'Visitas',      path: '#/visitas' },
  ]

  if (isGestor()) {
    navItems.push({ key: 'validacao', icon: '✅', label: 'Validação', path: '#/validacao' })
  }

  if (isAdmin()) {
    navItems.push({ key: 'usuarios', icon: '👥', label: 'Usuários', path: '#/usuarios' })
  }

  const navHtml = navItems.map(item => `
    <a class="nav-item${activeKey === item.key ? ' active' : ''}" href="${item.path}">
      <span class="nav-icon">${item.icon}</span>${item.label}
    </a>
  `).join('')

  document.getElementById('app').innerHTML = `
    <header class="header">
      <div class="header-left">
        <div class="header-logo">CO<span>SIS</span></div>
        <div class="header-tagline">Controle de Visitas · Lote 05</div>
      </div>
      <div class="header-right">
        <div class="user-pill">
          <div class="user-avatar">${initials}</div>
          <span>${nome}</span>
          <span class="${badgeClass}">${perfilLabel()}</span>
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-logout">Sair</button>
      </div>
    </header>
    <div class="layout">
      <nav class="sidebar">
        <div class="sidebar-section">
          <div class="sidebar-label">Navegação</div>
          ${navHtml}
        </div>
      </nav>
      <main class="main" id="main-content"></main>
    </div>
  `

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await sb.auth.signOut()
    navigate('/')
  })

  return document.getElementById('main-content')
}
