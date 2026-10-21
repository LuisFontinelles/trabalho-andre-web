# Como contribuir

Guia curto para a equipe trabalhar no painel web sem pisar no pé de ninguém.

## Antes de começar

```bash
npm install
npm run dev
```

Entre com `profissional@teste.com` e qualquer senha não vazia. O código de verificação é `0000`.

## O fluxo de uma mudança

1. **Pegue um card no Trello** e mova para Em andamento. Se não existe card, crie uma issue aqui.
2. **Abra uma branch** a partir da `main`.
3. **Faça a mudança**, respeitando as regras de arquitetura abaixo.
4. **Rode a verificação local** antes de abrir o PR.
5. **Abra o PR** preenchendo o template.
6. **Espere o CI ficar verde.** PR com CI vermelho não é revisado.

### Nome da branch

```
feat/publicar-oportunidade
fix/erro-no-filtro-de-distancia
docs/contrato-da-api
chore/atualiza-dependencias
```

### Mensagem de commit

Usamos Conventional Commits, em português e sem acento no título.

```
feat: tela de publicacao de oportunidade
fix: filtro de distancia ignorava oferta online
docs: contrato da API com os codigos de erro
test: cobertura do caso de uso de verificacao
chore: atualiza o React para 19.2
```

### Verificação local

Os quatro comandos que o CI roda. Se passam aqui, passam lá.

```bash
npx tsc -b
npm run lint
npm run test
npm run build
```

## Regras de arquitetura

A estrutura espelha a do aplicativo iOS. O que a sustenta é a direção das dependências.

```
app  →  presentation  →  domain  ←  data
                             ↑
                      designSystem
```

**O domínio não conhece ninguém.** Nada em `src/domain/` pode importar React, `fetch`, um DTO ou um componente. Se precisar de dados, declare um protocolo em `domain/repositories` e implemente em `data/repositories`.

**Nenhuma tela decide aparência.** Cor, espaçamento, raio, tipografia e ícone vêm dos tokens. Se faltar um token, acrescente em `designSystem/tokens` em vez de escrever o valor na tela.

**Texto de interface vai para `src/resources/strings.ts`.** Nenhuma string solta no meio de um componente.

**Quando uma decisão visual depende de uma regra**, o domínio expõe um conceito e o design system traduz. O exemplo no código é `vacancyLevel`, que devolve `none`, `low` ou `plenty`, e o componente decide a cor do selo.

## Recurso que ainda não funciona

Não esconda. Deixe o controle na tela, desabilitado, com um aviso do motivo. Os componentes já aceitam `isEnabled` e `disabledHint`.

A razão é prática: dá para enxergar o que falta rodando a aplicação, sem abrir o código nem este guia.

## Mexer no contrato da API

O contrato em `CONTRATO-API-CareBridge.md` é compartilhado com o aplicativo iOS e com o backend. Mudar um nome de campo, um tipo ou um código de status quebra os outros clientes.

Se precisar mudar, avise as duas frentes antes de implementar e marque a caixa correspondente no PR.

## Testes

Testamos domínio e camada de dados. Componente de tela não é testado por enquanto, porque o retorno não compensa no prazo do projeto.

Um teste bom descreve a regra, não o código:

```ts
it('ate cinco vagas conta como pouco', () => { ... })
```

em vez de

```ts
it('vacancyLevel retorna low', () => { ... })
```

O estado do backend simulado é reiniciado antes e depois de cada teste, então um teste nunca depende do que outro deixou.

## Revisão

Quem revisa olha três coisas, nesta ordem: se a direção das dependências foi respeitada, se o comportamento novo tem teste, e se o texto e a aparência saíram dos lugares certos.

Deixe o PR pequeno. Um PR que toca quatro camadas de uma vez costuma ser dois PRs.
