# Backend simulado

Este servidor simulado substitui o `fetch` exclusivamente nos testes automatizados. A aplicação executada no navegador usa a API real.

Isso é a tradução para o React do `FixtureURLProtocol` do aplicativo iOS, que intercepta o `URLSession`. A ideia é a mesma nos dois: **interceptar na camada mais baixa possível**, abaixo do cliente HTTP.

## Por que não repositórios falsos

A alternativa óbvia seria implementar os repositórios com dados fixos. Interceptar a rede é melhor por dois motivos.

O caminho real continua sendo exercitado: montagem da URL, código de status, cabeçalhos, decodificação e tratamento de erro. Um bug de decodificação aparece no desenvolvimento, não na integração.

Os testes instalam o interceptador explicitamente. A composição de produção não importa este módulo nem suas fixtures.

## Onde fica

`src/data/network/mockBackend.ts`, com as fixtures em `src/resources/fixtures/` (`contas`, `catalogos`, `oportunidades_profissional`, `inscricoes`), todas no formato do contrato v2.

## Rotas

As de produto seguem o `CONTRATO-API-CareBridge.md` (versão 2): sem `/v1`, nomes em português, valores fechados em MAIÚSCULAS.

Estas existem só para exercitar o tratamento de erro e **não precisam ser implementadas no servidor**:

| Rota | Status |
|---|---|
| `GET /debug/no-content` | 204 |
| `GET /debug/bad-request` | 400 |
| `GET /debug/unauthorized` | 401 |
| `GET /debug/forbidden` | 403 |
| `GET /debug/not-found` | 404 |
| `GET /debug/conflict` | 409 |
| `GET /debug/too-many` | 429 |
| `GET /debug/server-error` | 500 |

## Regras do mock

As da seção 10 do contrato, iguais às do mock do app iOS.

**Login de teste** aceita `profissional@teste.com` com qualquer senha não vazia (`paciente@teste.com` também entra, mas o painel recusa o perfil). Essas contas existem somente no mock e não são credenciais da API real.

**Token** é `mock.<email>` e vai em `Authorization: Bearer` nas rotas com cadeado. Sem token, ou com o token `expired`, a rota responde 401 e o painel volta para o login. Paciente numa rota do profissional recebe 403. Um token que não é do mock (o JWT da API real, quando login e cadastro vão para lá) vale como o profissional de demonstração.

**Verificação** aceita apenas `0000`. Qualquer outro código responde 401.

**Cadastro** guarda a conta em memória como `EM_VERIFICACAO`: ela pode salvar rascunho, mas publicar responde 403.

**Oportunidade**: publicar valida as regras da seção 5 (400 com o motivo), encerrada não aceita edição (409), só ativa encerra e só rascunho exclui (409).

**Solicitação**: decisão final não volta atrás (409), recusar sem motivo é 400, aprovar sem vaga é 409 e soma 1 em `vagasPreenchidas`, mensagens só em `APROVADA` (409), pedido de informação dá 3 dias de prazo.

## Latência

O mock pode simular latência de rede entre 50ms e 600ms conforme a rota.

Nos testes a latência é desligada:

```ts
createMockFetch({ latency: false })
```

## Corpo de erro

O do contrato: pelo menos `status` e `message`, com os campos padrão do Spring junto.

```json
{
  "status": 409,
  "message": "Já existe um usuário cadastrado com este e-mail.",
  "error": "Conflict",
  "path": "/auth/register",
  "timestamp": "2026-11-19T02:52:06Z"
}
```

O `NetworkError` carrega esse corpo e separa os casos: `unauthorized` (401), `forbidden` (403), `notFound`, `conflict` (409), `tooManyAttempts` (429), `badRequest` e `server`. A tela mostra a `message` do servidor quando ela explica o que fazer.

## Backend real

A aplicação usa o backend real em todos os fluxos. O mock permanece disponível somente quando a suíte injeta `createMockFetch()` explicitamente.
