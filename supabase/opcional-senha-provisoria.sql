-- OPCIONAL: permite que um administrador defina uma senha provisória para outro usuário
-- pela página Usuários do sistema. Rode no SQL Editor do Supabase SÓ se quiser esse recurso.
-- Motivo: o e-mail gratuito do Supabase não envia "esqueci minha senha" para quem não é da equipe do Supabase.
-- ---------------------------------------------------------------------
-- Senha provisória definida pelo administrador
-- (o e-mail gratuito do Supabase não envia "esqueci minha senha" para a equipe)
-- ---------------------------------------------------------------------
create or replace function public.admin_definir_senha(usuario uuid, nova_senha text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then
    raise exception 'permission denied';
  end if;
  if length(coalesce(nova_senha, '')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(nova_senha, extensions.gen_salt('bf')),
         updated_at = now()
   where id = usuario;
  if not found then
    raise exception 'Usuário não encontrado.';
  end if;
end $$;

revoke all on function public.admin_definir_senha(uuid, text) from public, anon;
grant execute on function public.admin_definir_senha(uuid, text) to authenticated;
