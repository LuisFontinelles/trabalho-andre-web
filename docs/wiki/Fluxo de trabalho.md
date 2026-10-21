# Fluxo de trabalho

## De uma tarefa até a `main`

1. **Pegue um card no Trello** e mova para Em andamento. Sem card, abra uma issue.
2. **Crie uma branch** a partir da `main`.
3. **Faça a mudança.**
4. **Rode a verificação local.**
5. **Abra o PR** preenchendo o template.
6. **Espere o CI.** PR com CI vermelho não é revisado.

## Nome da branch

```
feat/publicar-oportunidade
fix/erro-no-filtro-de-distancia
docs/contrato-da-api
chore/atualiza-dependencias
```

## Mensagem de commit

Conventional Commits, em português, sem acento no título.

```
feat: tela de publicacao de oportunidade
fix: filtro de distancia ignorava oferta online
test: cobertura do caso de uso de verificacao
```

## Verificação local

Os quatro comandos que o CI roda:

```bash
npx tsc -b
npm run lint
npm run test
npm run build
```

## O que o CI faz

`.github/workflows/ci.yml` roda a cada push e pull request na `main`: checagem de tipos, lint, testes e build de produção. O `dist` fica guardado como artefato por 7 dias.

## Testes

Testamos domínio e camada de dados. Componente de tela não é testado, porque o retorno não compensa no prazo do projeto.

Um teste descreve a regra, não o código:

```ts
it('ate cinco vagas conta como pouco', () => { ... })
```

O estado do mock é reiniciado antes e depois de cada teste, então nenhum teste depende do que outro deixou.

## Revisão

Quem revisa olha três coisas, nesta ordem:

1. A direção das dependências foi respeitada
2. O comportamento novo tem teste
3. Texto e aparência saíram dos lugares certos

PR pequeno é revisado rápido. Um PR que toca quatro camadas costuma ser dois PRs.

## Mexer no contrato da API

O contrato é compartilhado com o aplicativo iOS e com o backend. Mudar um nome de campo, um tipo ou um código de status quebra os outros clientes.

Avise as duas frentes antes de implementar e marque a caixa no PR.
