import { sb } from '../supabase.js'
import { state } from '../state.js'

// ── WGS84 → UTM (Transverse Mercator) ──────────────────────
function wgs84ToUtm(lat, lon) {
  const a  = 6378137.0
  const f  = 1 / 298.257223563
  const b  = a * (1 - f)
  const e2 = 1 - (b * b) / (a * a)
  const e4 = e2 * e2, e6 = e4 * e2
  const k0 = 0.9996

  const latR = lat * Math.PI / 180
  const lonR = lon * Math.PI / 180
  const zone = Math.floor((lon + 180) / 6) + 1
  const lon0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180

  const N  = a / Math.sqrt(1 - e2 * Math.sin(latR) ** 2)
  const T  = Math.tan(latR) ** 2
  const C  = (e2 / (1 - e2)) * Math.cos(latR) ** 2
  const A  = Math.cos(latR) * (lonR - lon0)
  const ep = e2 / (1 - e2)

  const M = a * (
    (1 - e2/4 - 3*e4/64 - 5*e6/256) * latR
    - (3*e2/8 + 3*e4/32 + 45*e6/1024) * Math.sin(2*latR)
    + (15*e4/256 + 45*e6/1024) * Math.sin(4*latR)
    - (35*e6/3072) * Math.sin(6*latR)
  )

  const leste = k0 * N * (
    A + (1-T+C)*A**3/6 + (5-18*T+T**2+72*C-58*ep)*A**5/120
  ) + 500000

  let norte = k0 * (M + N * Math.tan(latR) * (
    A**2/2 + (5-T+9*C+4*C**2)*A**4/24 + (61-58*T+T**2+600*C-330*ep)*A**6/720
  ))
  if (lat < 0) norte += 10000000

  return { zone: `${zone}${lat < 0 ? 'S' : 'N'}`, leste, norte }
}

// visita = null → criar novo | visita = objeto → editar existente
export function abrirModalVisita(instituicao, onSaved, visita = null) {
  const editando = visita !== null
  const existing = document.getElementById('modal-visita-overlay')
  if (existing) existing.remove()

  const tipo2 = instituicao.tipo_evento === 2

  const overlay = document.createElement('div')
  overlay.id = 'modal-visita-overlay'
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal" style="max-width:620px;width:95vw">
      <div class="modal-header">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:2px">${editando ? 'Editar Visita' : 'Nova Visita'}</div>
          <div style="font-size:15px;font-weight:700;color:var(--text)">${instituicao.nome}</div>
          ${editando && visita.status_validacao === 'rejeitada' ? `<div style="font-size:11px;color:#c0392b;margin-top:4px">⚠️ Visita rejeitada — editar irá reenviar para validação</div>` : ''}
        </div>
        <button class="drawer-close" id="modal-visita-close">✕</button>
      </div>
      <div class="modal-body">

        <div class="form-grid">
          <div class="form-group">
            <label>Data da Visita *</label>
            <input type="date" id="mv-data" required>
          </div>
          <div class="form-group">
            <label>Período *</label>
            <select id="mv-periodo">
              <option value="">Selecione</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Manhã/Tarde">Manhã/Tarde</option>
            </select>
          </div>
          <div class="form-group">
            <label>Qtd. Palestras</label>
            <input type="number" id="mv-palestras" min="0" value="1">
          </div>
          <div class="form-group">
            <label>Pessoa de Contato</label>
            <input type="text" id="mv-contato" placeholder="Nome do responsável">
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label>Telefone</label>
            <input type="text" id="mv-telefone" placeholder="(00) 00000-0000" style="max-width:200px">
          </div>
        </div>

        <div class="form-section-title">Localização GPS</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Latitude (decimal)</label>
            <input type="number" id="mv-lat" step="any" placeholder="-2.780671">
          </div>
          <div class="form-group">
            <label>Longitude (decimal)</label>
            <input type="number" id="mv-lon" step="any" placeholder="-43.085666">
          </div>
        </div>
        <div class="form-grid form-grid-4" id="utm-fields" style="opacity:.4;pointer-events:none">
          <div class="form-group">
            <label>UTM Norte</label>
            <input type="text" id="mv-utm-norte" readonly style="background:var(--cinza-pale)">
          </div>
          <div class="form-group">
            <label>UTM Leste</label>
            <input type="text" id="mv-utm-leste" readonly style="background:var(--cinza-pale)">
          </div>
          <div class="form-group">
            <label>Zona UTM</label>
            <input type="text" id="mv-utm-zona" readonly style="background:var(--cinza-pale)">
          </div>
        </div>

        <div class="form-section-title">Público Participante</div>
        <div class="form-grid form-grid-4">
          <div class="form-group">
            <label>Até 12 anos</label>
            <input type="number" id="mv-ate12" min="0" value="0" ${tipo2 ? 'disabled style="background:var(--cinza-pale)"' : ''}>
          </div>
          <div class="form-group">
            <label>13 a 17 anos</label>
            <input type="number" id="mv-13a17" min="0" value="0" ${tipo2 ? 'disabled style="background:var(--cinza-pale)"' : ''}>
          </div>
          <div class="form-group">
            <label>18 ou mais</label>
            <input type="number" id="mv-18mais" min="0" value="0">
          </div>
          <div class="form-group">
            <label>Total</label>
            <input type="number" id="mv-total" min="0" value="0" readonly style="background:var(--cinza-pale);color:var(--text2)">
          </div>
        </div>

        <div class="form-section-title">Kits Distribuídos</div>
        <div class="form-grid form-grid-4">
          <div class="form-group">
            <label>Instituição</label>
            <input type="number" id="mv-kit-inst" min="0" value="0">
          </div>
          <div class="form-group">
            <label>Criança</label>
            <input type="number" id="mv-kit-cri" min="0" value="0" disabled style="background:var(--cinza-pale)">
          </div>
          <div class="form-group">
            <label>Adolescente</label>
            <input type="number" id="mv-kit-ado" min="0" value="0" disabled style="background:var(--cinza-pale)">
          </div>
          <div class="form-group">
            <label>Adulto</label>
            <input type="number" id="mv-kit-adu" min="0" value="0" disabled style="background:var(--cinza-pale)">
          </div>
        </div>

        <div class="form-section-title">Fotos da Visita</div>
        <div class="foto-upload-area">
          <input type="file" id="mv-fotos" multiple accept="image/*" style="display:none">
          <div id="foto-preview-grid" class="foto-preview-grid"></div>
          <label for="mv-fotos" class="btn btn-ghost btn-sm" style="cursor:pointer;margin-top:8px">
            + Adicionar fotos
          </label>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">JPG, PNG, WEBP · máx. 10 MB por foto</div>
        </div>

        <div id="mv-erro" class="form-error hidden"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="mv-cancelar">Cancelar</button>
        <button class="btn btn-primary" id="mv-salvar">${editando ? 'Salvar Alterações' : 'Salvar Visita'}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('open'))

  const fechar = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200) }
  document.getElementById('modal-visita-close').addEventListener('click', fechar)
  document.getElementById('mv-cancelar').addEventListener('click', fechar)
  overlay.addEventListener('click', e => { if (e.target === overlay) fechar() })

  // ── GPS → UTM ────────────────────────────────────────────
  function atualizarUtm() {
    const lat = parseFloat(document.getElementById('mv-lat').value)
    const lon = parseFloat(document.getElementById('mv-lon').value)
    const utmWrap = document.getElementById('utm-fields')
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      const utm = wgs84ToUtm(lat, lon)
      document.getElementById('mv-utm-norte').value = utm.norte.toFixed(2)
      document.getElementById('mv-utm-leste').value = utm.leste.toFixed(2)
      document.getElementById('mv-utm-zona').value  = utm.zone
      utmWrap.style.opacity = '1'
      utmWrap.style.pointerEvents = 'none'
    } else {
      document.getElementById('mv-utm-norte').value = ''
      document.getElementById('mv-utm-leste').value = ''
      document.getElementById('mv-utm-zona').value  = ''
      utmWrap.style.opacity = '.4'
    }
  }
  document.getElementById('mv-lat').addEventListener('input', atualizarUtm)
  document.getElementById('mv-lon').addEventListener('input', atualizarUtm)

  // ── Total de pessoas + controle de kits ─────────────────
  function atualizarTotaisEKits() {
    const a12  = +document.getElementById('mv-ate12').value  || 0
    const a17  = +document.getElementById('mv-13a17').value  || 0
    const a18  = +document.getElementById('mv-18mais').value || 0
    document.getElementById('mv-total').value = a12 + a17 + a18

    // Kits habilitados apenas quando há pessoas na faixa
    const kitCri = document.getElementById('mv-kit-cri')
    const kitAdo = document.getElementById('mv-kit-ado')
    const kitAdu = document.getElementById('mv-kit-adu')

    // Tipo 2 → só adultos
    if (!tipo2) {
      setKitEnabled(kitCri, a12 > 0)
      setKitEnabled(kitAdo, a17 > 0)
    }
    setKitEnabled(kitAdu, a18 > 0)
  }

  function setKitEnabled(el, enabled) {
    el.disabled = !enabled
    el.style.background = enabled ? '' : 'var(--cinza-pale)'
    if (!enabled) el.value = '0'
  }

  if (!tipo2) {
    document.getElementById('mv-ate12').addEventListener('input', atualizarTotaisEKits)
    document.getElementById('mv-13a17').addEventListener('input', atualizarTotaisEKits)
  }
  document.getElementById('mv-18mais').addEventListener('input', atualizarTotaisEKits)

  // ── Pré-preencher campos no modo edição ──────────────────
  if (editando) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val }
    set('mv-data',      visita.data_visita)
    set('mv-periodo',   visita.periodo)
    set('mv-palestras', visita.qtd_palestras ?? '')
    set('mv-contato',   visita.pessoa_contato ?? '')
    set('mv-telefone',  visita.telefone ?? '')
    set('mv-lat',       visita.coord_lat ?? '')
    set('mv-lon',       visita.coord_lon ?? '')
    if (!tipo2) {
      set('mv-ate12',  visita.pessoas_ate12  ?? 0)
      set('mv-13a17',  visita.pessoas_13a17  ?? 0)
    }
    set('mv-18mais',    visita.pessoas_18mais ?? 0)
    if (!tipo2) {
      set('mv-kit-cri', visita.kits_crianca     ?? 0)
      set('mv-kit-ado', visita.kits_adolescente ?? 0)
    }
    set('mv-kit-inst',  visita.kits_instituicao ?? 0)
    set('mv-kit-adu',   visita.kits_adulto      ?? 0)
    if (visita.coord_lat && visita.coord_lon) atualizarUtm()
    atualizarTotaisEKits()
  }

  // ── Preview de fotos ─────────────────────────────────────
  let fotosParaUpload = []
  document.getElementById('mv-fotos').addEventListener('change', e => {
    fotosParaUpload = [...fotosParaUpload, ...Array.from(e.target.files)]
    renderPreviews()
    e.target.value = ''
  })
  function renderPreviews() {
    const grid = document.getElementById('foto-preview-grid')
    grid.innerHTML = fotosParaUpload.map((f, i) => `
      <div class="foto-preview-item">
        <img src="${URL.createObjectURL(f)}" alt="${f.name}">
        <button class="foto-preview-remove" data-idx="${i}" title="Remover">✕</button>
      </div>`).join('')
    grid.querySelectorAll('.foto-preview-remove').forEach(btn =>
      btn.addEventListener('click', () => {
        fotosParaUpload.splice(+btn.dataset.idx, 1)
        renderPreviews()
      }))
  }

  // ── Salvar ───────────────────────────────────────────────
  document.getElementById('mv-salvar').addEventListener('click', async () => {
    const erroEl = document.getElementById('mv-erro')
    erroEl.classList.add('hidden')

    const data_visita = document.getElementById('mv-data').value
    const periodo     = document.getElementById('mv-periodo').value
    if (!data_visita || !periodo) {
      erroEl.textContent = 'Data e período são obrigatórios.'
      erroEl.classList.remove('hidden')
      return
    }

    const btn = document.getElementById('mv-salvar')
    btn.disabled = true
    btn.textContent = 'Salvando…'

    const lat = parseFloat(document.getElementById('mv-lat').value)
    const lon = parseFloat(document.getElementById('mv-lon').value)
    const utmNorteVal = document.getElementById('mv-utm-norte').value
    const utmLesteVal = document.getElementById('mv-utm-leste').value
    const utmZonaVal  = document.getElementById('mv-utm-zona').value

    const ate12  = tipo2 ? null : (+document.getElementById('mv-ate12').value  || null)
    const a13a17 = tipo2 ? null : (+document.getElementById('mv-13a17').value  || null)
    const a18    = +document.getElementById('mv-18mais').value || null
    const total  = (ate12 ?? 0) + (a13a17 ?? 0) + (a18 ?? 0) || null

    const kitCri = tipo2 ? null : (+document.getElementById('mv-kit-cri').value || null)
    const kitAdo = tipo2 ? null : (+document.getElementById('mv-kit-ado').value || null)
    const kitAdu = +document.getElementById('mv-kit-adu').value || null
    const kitInst= +document.getElementById('mv-kit-inst').value || null
    const kitTot = (kitInst ?? 0) + (kitCri ?? 0) + (kitAdo ?? 0) + (kitAdu ?? 0) || null

    const payload = {
      instituicao_id:   instituicao.id,
      data_visita, periodo,
      qtd_palestras:    +document.getElementById('mv-palestras').value || null,
      pessoas_ate12:    ate12,
      pessoas_13a17:    a13a17,
      pessoas_18mais:   a18,
      pessoas_total:    total,
      kits_instituicao: kitInst,
      kits_crianca:     kitCri,
      kits_adolescente: kitAdo,
      kits_adulto:      kitAdu,
      kits_total:       kitTot,
      pessoa_contato:   document.getElementById('mv-contato').value.trim()  || null,
      telefone:         document.getElementById('mv-telefone').value.trim() || null,
      coord_lat:        !isNaN(lat) ? lat : null,
      coord_lon:        !isNaN(lon) ? lon : null,
      utm_norte:        utmNorteVal ? parseFloat(utmNorteVal) : null,
      utm_leste:        utmLesteVal ? parseFloat(utmLesteVal) : null,
      utm_zona:         utmZonaVal  || null,
      criado_por:       state.user.id,
      status_validacao: 'pendente',
    }

    // Se editando visita rejeitada → volta para pendente
    if (editando && visita.status_validacao === 'rejeitada') {
      payload.status_validacao = 'pendente'
      payload.motivo_negacao   = null
      payload.validado_por     = null
      payload.data_validacao   = null
    }

    let visitaId
    if (editando) {
      const { error } = await sb.from('visitas').update(payload).eq('id', visita.id)
      if (error) {
        erroEl.textContent = 'Erro ao salvar: ' + error.message
        erroEl.classList.remove('hidden')
        btn.disabled = false
        btn.textContent = 'Salvar Alterações'
        return
      }
      visitaId = visita.id
    } else {
      const { data: nova, error } = await sb.from('visitas').insert(payload).select().single()
      if (error) {
        erroEl.textContent = 'Erro ao salvar: ' + error.message
        erroEl.classList.remove('hidden')
        btn.disabled = false
        btn.textContent = 'Salvar Visita'
        return
      }
      visitaId = nova.id
    }

    if (fotosParaUpload.length > 0) {
      btn.textContent = 'Enviando fotos…'
      for (const foto of fotosParaUpload) {
        const ext  = foto.name.split('.').pop()
        const path = `${visitaId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await sb.storage.from('fotos-visitas').upload(path, foto)
        if (upErr) { console.error('Upload erro:', upErr); continue }
        const { data: { publicUrl } } = sb.storage.from('fotos-visitas').getPublicUrl(path)
        await sb.from('evidencias').insert({ visita_id: visitaId, tipo: 'foto', url: publicUrl, criado_por: state.user.id })
      }
    }

    fechar()
    onSaved?.()
  })
}
