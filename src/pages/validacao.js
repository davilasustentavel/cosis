import { sb } from '../supabase.js'
import { state } from '../state.js'
import { renderLayout } from '../layout.js'
import { toast } from '../ui.js'
import { abrirLightbox } from '../components/lightbox.js'

export async function renderValidacao() {
  const main = renderLayout('validacao')
  main.innerHTML = `
    <p class="page-title">Validação de Visitas</p>
    <p class="page-subtitle">Aprovar ou rejeitar visitas registradas pela equipe de campo</p>

    <div class="filter-bar">
      <select id="vf-uf"><option value="">UF (todas)</option></select>
      <select id="vf-municipio"><option value="">Município (todos)</option></select>
      <select id="vf-responsavel"><option value="">Responsável (todos)</option></select>
      <select id="vf-status">
        <option value="pendente" selected>Pendentes</option>
        <option value="aprovada">Aprovadas</option>
        <option value="rejeitada">Rejeitadas</option>
        <option value="">Todas</option>
      </select>
      <button class="btn btn-ghost btn-sm" id="vf-limpar">Limpar</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title" id="val-title">Visitas Pendentes</span>
        <span id="val-count" class="text-muted" style="font-size:12px"></span>
      </div>
      <div class="card-body">
        <div id="val-wrap">
          <div class="loading"><div class="spinner"></div> Carregando…</div>
        </div>
      </div>
    </div>

    <!-- Modal rejeição -->
    <div class="modal-overlay" id="modal-rejeicao">
      <div class="modal" style="max-width:420px;width:95vw">
        <div class="modal-header">
          <div style="font-size:15px;font-weight:700;color:var(--text)">Rejeitar Visita</div>
          <button class="drawer-close" id="modal-rej-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Motivo da Rejeição *</label>
            <textarea id="rej-motivo" rows="4"
              style="border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;font-family:inherit;font-size:13px;width:100%;resize:vertical;outline:none"
              placeholder="Descreva o motivo pelo qual a visita está sendo rejeitada…"></textarea>
          </div>
          <div id="rej-erro" class="form-error hidden"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="rej-cancelar">Cancelar</button>
          <button class="btn" style="background:#c0392b;color:white" id="rej-confirmar">Confirmar Rejeição</button>
        </div>
      </div>
    </div>
  `

  let allRows = []
  let visitaParaRejeitar = null

  // ── Carregar dados ────────────────────────────────────────
  async function load() {
    const { data, error } = await sb
      .from('visitas')
      .select(`
        id, data_visita, periodo, pessoas_total, status_validacao,
        motivo_negacao, validado_por, data_validacao, criado_por,
        instituicoes(nome, municipios(nome, estados(sigla, nome)))
      `)
      .order('data_visita', { ascending: false })

    if (error) { console.error(error); return }
    allRows = data ?? []

    // Nomes dos responsáveis
    const uuids = [...new Set(allRows.map(v => v.criado_por).filter(Boolean))]
    const nomeMap = {}
    if (uuids.length) {
      const { data: usrs } = await sb.from('usuarios').select('id, nome').in('id', uuids)
      ;(usrs ?? []).forEach(u => { nomeMap[u.id] = u.nome })
    }
    allRows._nomeMap = nomeMap

    // Fotos por visita
    const ids = allRows.map(v => v.id)
    const fotoMap = {}
    if (ids.length) {
      const { data: evids } = await sb.from('evidencias').select('visita_id, url').in('visita_id', ids).eq('tipo', 'foto')
      ;(evids ?? []).forEach(e => {
        if (!fotoMap[e.visita_id]) fotoMap[e.visita_id] = []
        fotoMap[e.visita_id].push(e.url)
      })
    }
    allRows._fotoMap = fotoMap

    popularFiltros()
    applyFilters()
  }

  function popularFiltros() {
    const nomeMap = allRows._nomeMap ?? {}
    const ufs = [...new Set(allRows.map(v => v.instituicoes?.municipios?.estados?.sigla).filter(Boolean))].sort()
    const fUf = document.getElementById('vf-uf')
    ufs.forEach(uf => { const o = document.createElement('option'); o.value = uf; o.textContent = uf; fUf.appendChild(o) })

    const resps = [...new Set(allRows.map(v => v.criado_por).filter(Boolean))]
    const fResp = document.getElementById('vf-responsavel')
    resps.forEach(id => { const o = document.createElement('option'); o.value = id; o.textContent = nomeMap[id] ?? id; fResp.appendChild(o) })
  }

  function popularMunicipios(uf) {
    const fMun = document.getElementById('vf-municipio')
    fMun.innerHTML = '<option value="">Município (todos)</option>'
    const muns = [...new Set(
      allRows.filter(v => !uf || v.instituicoes?.municipios?.estados?.sigla === uf)
        .map(v => v.instituicoes?.municipios?.nome).filter(Boolean)
    )].sort()
    muns.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; fMun.appendChild(o) })
  }

  function applyFilters() {
    const uf    = document.getElementById('vf-uf').value
    const mun   = document.getElementById('vf-municipio').value
    const resp  = document.getElementById('vf-responsavel').value
    const st    = document.getElementById('vf-status').value

    const rows = allRows.filter(v => {
      if (uf   && v.instituicoes?.municipios?.estados?.sigla !== uf)  return false
      if (mun  && v.instituicoes?.municipios?.nome !== mun)            return false
      if (resp && v.criado_por !== resp)                               return false
      if (st   && v.status_validacao !== st)                           return false
      return true
    })

    const titles = { pendente: 'Visitas Pendentes', aprovada: 'Visitas Aprovadas', rejeitada: 'Visitas Rejeitadas', '': 'Todas as Visitas' }
    document.getElementById('val-title').textContent = titles[document.getElementById('vf-status').value] ?? 'Visitas'
    renderTable(rows)
  }

  function renderTable(rows) {
    const nomeMap = allRows._nomeMap ?? {}
    const fotoMap = allRows._fotoMap ?? {}
    document.getElementById('val-count').textContent = `${rows.length} registros`

    if (!rows.length) {
      document.getElementById('val-wrap').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <div class="empty-text">Nenhuma visita encontrada</div>
          <div class="empty-sub">Ajuste os filtros para ampliar a busca</div>
        </div>`
      return
    }

    document.getElementById('val-wrap').innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Instituição</th>
            <th>Município / UF</th>
            <th>Responsável</th>
            <th style="text-align:center">Pessoas</th>
            <th style="text-align:center">Fotos</th>
            <th style="text-align:center">Status</th>
            <th style="text-align:center">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(v => {
            const fotos = fotoMap[v.id] ?? []
            const fotoBtn = fotos.length
              ? `<button class="btn-fotos btn-fotos-val" data-id="${v.id}" title="Ver fotos">📷 ${fotos.length}</button>`
              : `<span style="color:var(--text3)">—</span>`

            const acoes = v.status_validacao === 'pendente' ? `
              <button class="btn btn-sm" style="background:#27ae60;color:white;margin-right:4px" data-aprovar="${v.id}">Aprovar</button>
              <button class="btn btn-sm" style="background:#c0392b;color:white" data-rejeitar="${v.id}">Rejeitar</button>
            ` : v.status_validacao === 'rejeitada'
              ? `<span style="font-size:11px;color:var(--text3)" title="${v.motivo_negacao ?? ''}">Rejeitada por ${v.validado_por ?? '—'}</span>`
              : `<span style="font-size:11px;color:var(--text3)">Aprovada por ${v.validado_por ?? '—'}</span>`

            return `
              <tr>
                <td style="white-space:nowrap">${formatDate(v.data_visita)}</td>
                <td style="font-weight:600;max-width:220px">${v.instituicoes?.nome ?? '—'}</td>
                <td style="white-space:nowrap">${v.instituicoes?.municipios?.nome ?? '—'} / ${v.instituicoes?.municipios?.estados?.sigla ?? '—'}</td>
                <td>${nomeMap[v.criado_por] ?? '—'}</td>
                <td style="text-align:center">${v.pessoas_total ?? '—'}</td>
                <td style="text-align:center">${fotoBtn}</td>
                <td style="text-align:center">${statusChip(v.status_validacao)}</td>
                <td style="text-align:center;white-space:nowrap">${acoes}</td>
              </tr>
              ${v.status_validacao === 'rejeitada' && v.motivo_negacao ? `
              <tr>
                <td colspan="8" style="padding:4px 14px 10px;font-size:12px;color:#c0392b;background:#fff5f5">
                  <strong>Motivo:</strong> ${v.motivo_negacao}
                </td>
              </tr>` : ''}`
          }).join('')}
        </tbody>
      </table>`

    // Fotos
    document.querySelectorAll('.btn-fotos-val').forEach(btn => {
      btn.addEventListener('click', () => {
        const fotos = fotoMap[+btn.dataset.id] ?? []
        if (fotos.length) abrirLightbox(fotos, 0)
      })
    })

    // Aprovar
    document.querySelectorAll('[data-aprovar]').forEach(btn => {
      btn.addEventListener('click', () => aprovar(+btn.dataset.aprovar))
    })

    // Rejeitar
    document.querySelectorAll('[data-rejeitar]').forEach(btn => {
      btn.addEventListener('click', () => {
        visitaParaRejeitar = +btn.dataset.rejeitar
        document.getElementById('rej-motivo').value = ''
        document.getElementById('rej-erro').classList.add('hidden')
        document.getElementById('modal-rejeicao').classList.add('open')
      })
    })
  }

  async function aprovar(id) {
    const { error } = await sb.from('visitas').update({
      status_validacao: 'aprovada',
      validado_por:     state.profile?.nome ?? state.user?.email,
      data_validacao:   new Date().toISOString(),
    }).eq('id', id)

    if (error) { toast('Erro ao aprovar: ' + error.message, 'error'); return }
    toast('Visita aprovada!', 'success')
    await load()
  }

  async function rejeitar(id, motivo) {
    const { error } = await sb.from('visitas').update({
      status_validacao: 'rejeitada',
      motivo_negacao:   motivo,
      validado_por:     state.profile?.nome ?? state.user?.email,
      data_validacao:   new Date().toISOString(),
    }).eq('id', id)

    if (error) { toast('Erro ao rejeitar: ' + error.message, 'error'); return }
    toast('Visita rejeitada.', '')
    await load()
  }

  // ── Modal rejeição ────────────────────────────────────────
  const fecharRejeicao = () => document.getElementById('modal-rejeicao').classList.remove('open')
  document.getElementById('modal-rej-close').addEventListener('click', fecharRejeicao)
  document.getElementById('rej-cancelar').addEventListener('click', fecharRejeicao)
  document.getElementById('modal-rejeicao').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharRejeicao()
  })
  document.getElementById('rej-confirmar').addEventListener('click', async () => {
    const motivo = document.getElementById('rej-motivo').value.trim()
    if (!motivo) {
      document.getElementById('rej-erro').textContent = 'O motivo é obrigatório.'
      document.getElementById('rej-erro').classList.remove('hidden')
      return
    }
    fecharRejeicao()
    await rejeitar(visitaParaRejeitar, motivo)
  })

  // ── Filtros ───────────────────────────────────────────────
  document.getElementById('vf-uf').addEventListener('change', () => {
    popularMunicipios(document.getElementById('vf-uf').value)
    document.getElementById('vf-municipio').value = ''
    applyFilters()
  })
  ;['vf-municipio','vf-responsavel','vf-status'].forEach(id =>
    document.getElementById(id).addEventListener('change', applyFilters))

  document.getElementById('vf-limpar').addEventListener('click', () => {
    document.getElementById('vf-uf').value = ''
    document.getElementById('vf-status').value = 'pendente'
    document.getElementById('vf-responsavel').value = ''
    popularMunicipios('')
    applyFilters()
  })

  load()
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
