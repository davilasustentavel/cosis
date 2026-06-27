import { sb } from '../supabase.js'
import { state } from '../state.js'
import { renderLayout } from '../layout.js'

export async function renderDashboard() {
  const main = renderLayout('dashboard')
  main.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando…</div>'

  const [
    { count: totalInst },
    { count: totalVis },
    { count: totalAtivas },
    { count: totalPendentes },
  ] = await Promise.all([
    sb.from('instituicoes').select('*', { count: 'exact', head: true }),
    sb.from('visitas').select('*', { count: 'exact', head: true }),
    sb.from('instituicoes').select('*', { count: 'exact', head: true }).eq('ativa', true),
    sb.from('visitas').select('*', { count: 'exact', head: true }).eq('status_validacao', 'pendente'),
  ])

  const nome = state.profile?.nome?.split(' ')[0] ?? 'usuário'

  main.innerHTML = `
    <p class="page-title">Olá, ${nome} 👋</p>
    <p class="page-subtitle">Resumo geral do projeto COSIS · MA, RN, CE</p>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${totalInst ?? '—'}</div>
        <div class="stat-label">Instituições</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalAtivas ?? '—'}</div>
        <div class="stat-label">Inst. Ativas</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalVis ?? '—'}</div>
        <div class="stat-label">Visitas Registradas</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:${(totalPendentes ?? 0) > 0 ? 'var(--red)' : 'var(--green)'}">
          ${totalPendentes ?? '—'}
        </div>
        <div class="stat-label">Aguardando Validação</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Acesso Rápido</span>
      </div>
      <div style="padding:16px;display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn btn-primary" href="#/instituicoes">🏫 Ver Instituições</a>
        <a class="btn btn-ghost" href="#/visitas">📋 Registrar Visita</a>
      </div>
    </div>
  `
}
