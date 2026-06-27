import { sb } from '../supabase.js'
import { state, isGestor } from '../state.js'
import { renderLayout } from '../layout.js'
import { toast } from '../ui.js'

export async function renderVisitas() {
  const main = renderLayout('visitas')
  main.innerHTML = `
    <p class="page-title">Visitas</p>
    <p class="page-subtitle">Registro e acompanhamento de visitas às instituições</p>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Visitas Registradas</span>
        <span id="count-label" class="text-muted" style="font-size:12px"></span>
      </div>
      <div class="card-body">
        <div id="table-wrap">
          <div class="loading"><div class="spinner"></div> Carregando…</div>
        </div>
      </div>
    </div>
  `

  const { data: visitas } = await sb
    .from('visitas')
    .select(`
      id, data_visita, periodo, status_validacao,
      pessoas_total, qtd_palestras,
      instituicoes(item, nome, municipios(nome, estados(sigla)))
    `)
    .order('data_visita', { ascending: false })
    .limit(200)

  const rows = visitas ?? []
  document.getElementById('count-label').textContent = `${rows.length} visitas`

  if (!rows.length) {
    document.getElementById('table-wrap').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">Nenhuma visita registrada</div>
      </div>`
    return
  }

  document.getElementById('table-wrap').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Instituição</th>
          <th>Município / UF</th>
          <th>Período</th>
          <th>Pessoas</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(v => `
          <tr>
            <td style="white-space:nowrap">${formatDate(v.data_visita)}</td>
            <td style="font-weight:600">${v.instituicoes?.nome ?? '—'}</td>
            <td>${v.instituicoes?.municipios?.nome ?? '—'} / ${v.instituicoes?.municipios?.estados?.sigla ?? '—'}</td>
            <td>${v.periodo ?? '—'}</td>
            <td>${v.pessoas_total ?? '—'}</td>
            <td>${statusChip(v.status_validacao)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`
}

function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function statusChip(s) {
  if (s === 'aprovada') return '<span class="chip chip-green">Aprovada</span>'
  if (s === 'rejeitada') return '<span class="chip chip-gray">Rejeitada</span>'
  return '<span class="chip chip-yellow">Pendente</span>'
}
