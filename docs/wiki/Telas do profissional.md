# Telas do profissional

As telas seguem o protótipo entregue pelo grupo. Esta página liga cada tela ao código que a implementa, para quem precisar comparar as duas coisas.

## Minhas oportunidades

`src/presentation/MyOpportunities/MyOpportunitiesPage.tsx`

Três indicadores no topo (ativas, solicitações, aceitas) e uma tabela com oportunidade, acesso, vagas no formato "3 de 5", solicitações, status e as ações da linha.

As ações não são decididas pela tela. O domínio responde por elas em `canEdit`, `canClose` e `canDelete`:

| Status | Editar | Encerrar | Excluir |
|---|---|---|---|
| Ativa | sim | sim | sim |
| Rascunho | sim | não | sim |
| Encerrada | não | não | sim |

Rascunho não tem o que encerrar porque nunca foi publicado; encerrada já acabou. Manter isso no domínio evita a regra se espalhar pela tabela.

Encerrar e excluir pedem confirmação e recarregam a lista.

## Nova oportunidade

`src/presentation/NewOpportunity/NewOpportunityPage.tsx` e `src/domain/opportunityDraft.ts`

Três passos, validados um de cada vez. O rascunho inteiro vive em um estado só, e cada passo valida apenas os campos que mostra — tentar avançar no passo 1 não reclama de vagas.

**1. Dados básicos.** Título é opcional, como no protótipo. Descrição, especialidade e público-alvo são obrigatórios. Endereço só é exigido quando o atendimento é presencial.

**2. Condições de acesso.** Gratuito, preço social ou pesquisa. Só preço social admite valor, e trocar de modalidade limpa o preço digitado antes. Vagas precisam ser um inteiro positivo, e o encerramento não pode vir antes do início.

**3. Triagem e documentos.** Formulário padrão com quatro perguntas prontas, ou personalizado, em que o profissional escreve as suas. Pelo menos uma pergunta preenchida.

## Solicitações recebidas

`src/presentation/Requests/RequestsPage.tsx`

Chips de filtro, Todas e um por estado, com a contagem calculada por `countByFilter`. A coluna "Recebida" mostra tempo relativo — "Hoje", "Ontem", "3 dias" — produzido por `relativeDay`, que trata data inválida e data no futuro sem quebrar.

O botão da linha muda conforme o caso: "Mensagem", com um ponto quando há mensagem não lida, ou "Ver".

## Detalhe da solicitação

`src/presentation/Requests/RequestDetailPage.tsx`

Duas colunas. À esquerda as respostas da triagem e os documentos; à direita a decisão e a conversa.

A solicitação tem os 6 estados do contrato, os mesmos do app do paciente: Recebida, Em análise, Aguardando informações, Aprovada, Recusada e Cancelada. A decisão é só aprovar ou recusar, e não volta atrás. Aprovar leva o combinado (`quando`, `onde`, `levar`) e libera a conversa; recusar exige o motivo. Cancelada é o paciente que desistiu: tom neutro e nenhuma ação.

Abaixo de 1040px as colunas viram uma só.
