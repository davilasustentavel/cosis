import { sb } from '../supabase.js'
import { setLoading } from '../ui.js'

export function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-logo">
          <img src="/cosis/logo-davila.svg" alt="dAvila Soluções Sustentáveis" class="login-logo-img">
          <div class="login-logo-text">CO<span>SIS</span></div>
          <div class="login-logo-sub">Controle de Visitas · Lote 05</div>
        </div>
        <p class="login-title">Acesse com suas credenciais</p>

        <div class="form-group">
          <label for="email">E-mail</label>
          <input id="email" type="email" placeholder="seu@email.com" autocomplete="username">
        </div>
        <div class="form-group">
          <label for="senha">Senha</label>
          <input id="senha" type="password" placeholder="••••••••" autocomplete="current-password">
        </div>
        <div id="login-erro" class="form-error hidden"></div>

        <button class="btn btn-primary" style="width:100%;margin-top:8px" id="btn-entrar">
          Entrar
        </button>
      </div>
    </div>
  `

  const emailEl = document.getElementById('email')
  const senhaEl = document.getElementById('senha')
  const erroEl  = document.getElementById('login-erro')
  const btnEl   = document.getElementById('btn-entrar')

  async function login() {
    const email = emailEl.value.trim()
    const senha = senhaEl.value
    erroEl.classList.add('hidden')
    erroEl.textContent = ''

    if (!email || !senha) {
      erroEl.textContent = 'Preencha e-mail e senha.'
      erroEl.classList.remove('hidden')
      return
    }

    setLoading(btnEl, true)
    const { error } = await sb.auth.signInWithPassword({ email, password: senha })
    setLoading(btnEl, false)

    if (error) {
      erroEl.textContent = 'E-mail ou senha inválidos.'
      erroEl.classList.remove('hidden')
    }
    // sucesso → onAuthStateChange em main.js redireciona
  }

  btnEl.addEventListener('click', login)
  senhaEl.addEventListener('keydown', e => { if (e.key === 'Enter') login() })
  emailEl.addEventListener('keydown', e => { if (e.key === 'Enter') senhaEl.focus() })
}
