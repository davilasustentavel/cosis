import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Cliente com JWT do chamador para verificar permissão
  const sbCaller = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authErr } = await sbCaller.auth.getUser()
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: profile } = await sbCaller
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (profile?.perfil !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acesso restrito ao administrador' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Cliente admin para criar o usuário
  const sbAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { nome, email, senha, perfil } = await req.json()

  if (!nome || !email || !senha) {
    return new Response(JSON.stringify({ error: 'Nome, e-mail e senha são obrigatórios' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })

  if (createErr) {
    return new Response(JSON.stringify({ error: createErr.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  await sbAdmin.from('usuarios').insert({
    id: created.user.id,
    nome,
    email,
    perfil: perfil ?? 'campo',
    ativo: true,
  })

  return new Response(JSON.stringify({ success: true, id: created.user.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
