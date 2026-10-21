# Backend simulado

O backend ainda não existe. A aplicação roda inteira sobre um servidor de mentira que substitui o `fetch`.

Isso é a tradução para o React do `FixtureURLProtocol` do aplicativo iOS, que intercepta o `URLSession`. A ideia é a mesma nos dois: **interceptar na camada mais baixa possível**, abaixo do cliente HTTP.

## Por que não repositórios falsos

A alternativa óbvia seria implementar os repositórios com dados fixos. Interceptar a rede é melhor por dois motivos.

O caminho real continua sendo exercitado: montagem da URL, código de status, cabeçalhos, decodificação e tratamento de erro. Um bug de decodificação aparece no desenvolvimento, não na integração.

E apontar para a API de verdade vira não instalar o interceptador. Nenhuma tela, nenhum caso de uso e nenhum repositório mudam.

## Onde fica

`src/data/network/mockBackend.ts`, com as fixtures em `src/resources/fixtures/`.

Os JSONs são **os mesmos arquivos do projeto iOS**, copiados. As duas interfaces mostram exatamente os mesmos dados, o que facilita comparar comportamento.

## Rotas

As de produto seguem o contrato em `CONTRATO-API-CareBridge.md`.

Estas existem só para exercitar o tratamento de erro e **não precisam ser implementadas no servidor**:

| Rota | Status |
|---|---|
| `GET /v1/debug/no-content` | 204 |
| `GET /v1/debug/bad-request` | 400 |
| `GET /v1/debug/unauthorized` | 401 |
| `GET /v1/debug/not-found` | 404 |
| `GET /v1/debug/server-error` | 500 |

## Regras do mock

**Login** aceita apenas `profissional@teste.com` e `paciente@teste.com`, com qualquer senha não vazia. Qualquer outro e-mail responde 401.

**Verificação** aceita apenas `0000`. Qualquer outro código responde 401.

**Cadastro** guarda o registro em memória, e a verificação devolve o perfil e o nome cadastrados, não uma conta fixa.

## Latência

O mock simula latência de rede por padrão, entre 50ms e 500ms conforme a rota, para os estados de carregamento serem visíveis no desenvolvimento.

Nos testes a latência é desligada:

```ts
createMockFetch({ latency: false })
```

## Corpo de erro

O mesmo formato em todas as rotas, igual ao que o backend vai devolver:

```json
{
  "statusCode": 404,
  "message": "Not Found: user not found",
  "error": "Not Found",
  "requestId": "ddfd6adc-59d5-4ef0-a1f1-7bc904c9b17e"
}
```

O `NetworkError` carrega esse corpo, então a tela pode mostrar a mensagem do servidor quando ela for útil, e uma mensagem própria quando não for.

## Quando o backend chegar

1. Trocar `BASE_URL` pela URL real.
2. Chamar `createDependencies()` sem passar o `createMockFetch()`.
3. Remover a lógica de filtro e paginação do `createOpportunityRepository`, que hoje roda no cliente e passa a ser responsabilidade do servidor.

Dá para fazer rota por rota, sem big bang: basta encaminhar ao servidor as que já existem e deixar o mock responder o resto.
