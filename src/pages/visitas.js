import { sb } from '../supabase.js'
import { renderLayout } from '../layout.js'

export async function renderVisitas() {
  const main = renderLayout('visitas')
  main.innerHTML = `
    <p class="page-title">Visitas</p>
    <p class="page-subtitle">Registro e acompanhamento de visitas às instituições</p>

    <div class="filter-bar">
      <select id="vv-status">
        <option value="">Todas</option>
        <option value="pendente">Pendentes</option>
        <option value="aprovada">Aprovadas</option>
        <option value="rejeitada">Rejeitadas</option>
      </select>
      <select id="vv-uf"><option value="">UF (todas)</option></select>
      <select id="vv-municipio"><option value="">Município (todos)</option></select>
      <button class="btn btn-ghost btn-sm" id="vv-limpar">Limpar</button>
    </div>

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

  const { data } = await sb
    .from('visitas')
    .select(`
      id, data_visita, periodo, status_validacao, motivo_negacao,
      validado_por, pessoas_total, qtd_palestras,
      instituicoes(item, nome, municipios(nome, estados(sigla)))
    `)
    .order('data_visita', { ascending: false })

  const allRows = data ?? []

  // Popular filtros UF / Município
  const ufs = [...new Set(allRows.map(v => v.instituicoes?.municipios?.estados?.sigla).filter(Boolean))].sort()
  const fUf = document.getElementById('vv-uf')
  ufs.forEach(uf => { const o = document.createElement('option'); o.value = uf; o.textContent = uf; fUf.appendChild(o) })

  function popularMunicipios(uf) {
    const fMun = document.getElementById('vv-municipio')
    fMun.innerHTML = '<option value="">Município (todos)</option>'
    const muns = [...new Set(
      allRows.filter(v => !uf || v.instituicoes?.municipios?.estados?.sigla === uf)
        .map(v => v.instituicoes?.municipios?.nome).filter(Boolean)
    )].sort()
    muns.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; fMun.appendChild(o) })
  }

  function applyFilters() {
    const st  = document.getElementById('vv-status').value
    const uf  = document.getElementById('vv-uf').value
    const mun = document.getElementById('vv-municipio').value

    const rows = allRows.filter(v => {
      if (st  && v.status_validacao !== st) return false
      if (uf  && v.instituicoes?.municipios?.estados?.sigla !== uf) return false
      if (mun && v.instituicoes?.municipios?.nome !== mun) return false
      return true
    })
    renderTable(rows)
  }

  function renderTable(rows) {
    document.getElementById('count-label').textContent = `${rows.length} de ${allRows.length} visitas`

    if (!rows.length) {
      document.getElementById('table-wrap').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-text">Nenhuma visita encontrada</div>
          <div class="empty-sub">Ajuste os filtros para ampliar a busca</div>
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
            <th style="text-align:center">Pessoas</th>
            <th style="text-align:center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(v => `
            <tr>
              <td style="white-space:nowrap">${formatDate(v.data_visita)}</td>
              <td style="font-weight:600">${v.instituicoes?.nome ?? '—'}</td>
              <td style="white-space:nowrap">${v.instituicoes?.municipios?.nome ?? '—'} / ${v.instituicoes?.municipios?.estados?.sigla ?? '—'}</td>
              <td>${v.periodo ?? '—'}</td>
              <td style="text-align:center">${v.pessoas_total ?? '—'}</td>
              <td style="text-align:center">${statusChip(v.status_validacao)}</td>
            </tr>
            ${v.status_validacao === 'rejeitada' && v.motivo_negacao ? `
            <tr>
              <td colspan="6" style="padding:4px 14px 10px;font-size:12px;color:#c0392b;background:#fff5f5;border-bottom:1px solid #fcd">
                <strong>Motivo da rejeição:</strong> ${v.motivo_negacao}
                ${v.validado_por ? `<span style="color:var(--text3)"> — por ${v.validado_por}</span>` : ''}
              </td>
            </tr>` : ''}
          `).join('')}
        </tbody>
      </table>`
  }

  document.getElementById('vv-uf').addEventListener('change', () => {
    popularMunicipios(document.getElementById('vv-uf').value)
    document.getElementById('vv-municipio').value = ''
    applyFilters()
  })
  ;['vv-status','vv-municipio'].forEach(id =>
    document.getElementById(id).addEventListener('change', applyFilters))

  document.getElementById('vv-limpar').addEventListener('click', () => {
    document.getElementById('vv-status').value = ''
    document.getElementById('vv-uf').value = ''
    popularMunicipios('')
    applyFilters()
  })

  applyFilters()
}

function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function statusChip(s) {
  if (s === 'aprovada')  return '<span class="chip chip-green">Aprovada</span>'
  if (s === 'rejeitada') return '<span class="chip chip-red">Rejeitada</span>'
  return '<span class="chip chip-yellow">Pendente</span>'
}
