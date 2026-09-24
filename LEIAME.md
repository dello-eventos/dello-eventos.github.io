# Dello · Gestão de Eventos

Sistema para cadastrar, aprovar e acompanhar o investimento em eventos (feiras, convenções, workshops, ações em cliente etc.).

**Endereço:** https://dello-eventos.github.io/

**Custo: R$ 0.** O sistema usa só planos gratuitos:
- **Site:** GitHub Pages, repositório `dello-eventos/dello-eventos.github.io` (organização **dello-eventos**).
- **Banco de dados e login:** Supabase, projeto `dello-eventos`, organização **Dello**, região São Paulo.
- **Manter o banco ativo:** uma tarefa do GitHub Actions faz uma consulta leve a cada 3 dias. Assim o Supabase gratuito não pausa por falta de uso.

## Permissões

| Papel | Ver eventos | Criar | Editar / excluir | Gerenciar usuários |
|---|---|---|---|---|
| **Administrador** | todos | sim | **qualquer evento** | sim |
| **Usuário** | todos | sim | **só os que criou** | não |
| **Pendente** | não | não | não | não |

As regras ficam **no banco de dados** (Row Level Security), não só na tela.

- A **primeira conta criada vira administrador automaticamente**.
- As seguintes ficam **pendentes** até um admin liberar em **Usuários**.
- Não há confirmação por e-mail. O e-mail gratuito do Supabase só envia mensagens para membros da equipe do Supabase, então a proteção de acesso é a aprovação do administrador.

## Como dar acesso a alguém

1. Envie o link do sistema.
2. A pessoa clica em **Criar conta**.
3. Em **Usuários**, ligue o acesso dela e escolha o papel.

## Esqueci minha senha

O administrador define uma **senha provisória** em **Usuários → Senha provisória**. A pessoa troca depois no ícone de chave, ao lado do nome.

Esse recurso **já está ativado** no banco. Se um dia o banco for recriado, rode de novo:
1. Abra Supabase → projeto `dello-eventos` → **SQL Editor** → **New query**.
2. Cole o conteúdo de [`supabase/opcional-senha-provisoria.sql`](supabase/opcional-senha-provisoria.sql).
3. Clique em **Run**.

## Funcionalidades

- **Painel:** investimento aprovado e em análise, gráficos por mês e por tipo, próximos eventos.
- **Eventos:** busca e filtros por situação, tipo, gerente e "só os meus".
- **Cadastro do evento:**
  - situação por cor e número sequencial automático;
  - contratos, serviços, gastos diversos, envolvidos, hospedagem, alimentação, passagens e observações;
  - total somado na hora.
- **Tecla Enter:** avança de campo em campo, abre uma nova linha no fim de uma linha preenchida e, numa linha vazia, pula para a próxima seção.
- **Duplicar evento:** útil para feiras que se repetem.
- **Relatórios:**
  - por situação, evento, gerente, tipo ou período;
  - formato resumido ou detalhado;
  - Imprimir/PDF, WhatsApp, E-mail e Excel.
- **Histórico:** registro automático de quem criou, alterou (com antes e depois) ou excluiu cada evento.
- **Usuários:** aprovar acesso, definir administradores e senhas provisórias.

## Cuidados

- **Backup:** o plano gratuito não tem backup automático. De vez em quando, exporte tudo em **Relatórios → Excel**.
- **Dados pessoais (LGPD):** dê acesso só a quem precisa e bloqueie em **Usuários** quem sair da empresa.
- A chave em `assets/config.js` é a **publishable**, feita para ficar pública. **Nunca** coloque a chave *secret* no site.
- O repositório é público porque o GitHub Pages gratuito exige isso. Nenhum dado da empresa fica no código: tudo está no banco, protegido por login.

## Estrutura

```
index.html                           página principal
assets/app.js                        sistema (telas, regras, relatórios)
assets/styles.css                    visual (cores e fonte da Dello)
assets/config.js                     conexão com o Supabase
assets/logo-dello.png                logo
supabase/schema.sql                  tabelas, permissões e histórico (já aplicado)
supabase/opcional-senha-provisoria.sql  senha provisória definida pelo admin (já aplicado)
.github/workflows/manter-banco-ativo.yml  consulta a cada 3 dias para o banco não pausar
```

**Atualizar o site:** toda alteração enviada (push) para a branch `main` é publicada automaticamente em 1 a 2 minutos.

**Testar localmente:** `python -m http.server 5510` na pasta do projeto e abra http://localhost:5510. Para usar o **modo demonstração**, com dados só no navegador, deixe os valores de `assets/config.js` vazios.
