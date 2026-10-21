# CareBridge · painel web do profissional

[![CI](https://github.com/LuisFontinelles/trabalho-andre-web/actions/workflows/ci.yml/badge.svg)](https://github.com/LuisFontinelles/trabalho-andre-web/actions/workflows/ci.yml)
[![Pages](https://github.com/LuisFontinelles/trabalho-andre-web/actions/workflows/pages.yml/badge.svg)](https://github.com/LuisFontinelles/trabalho-andre-web/actions/workflows/pages.yml)

## 🔗 Abrir o site

**https://luisfontinelles.github.io/trabalho-andre-web/**

Não precisa instalar nada: o site roda no navegador, sobre dados de demonstração. Entre com **`profissional@teste.com`** e qualquer senha; se o cadastro pedir código de verificação, use **`0000`**.

A sessão dura enquanto a aba estiver aberta, então recarregar a página não desloga. Como os dados são de demonstração, o que você criar ou alterar volta ao estado inicial quando a aba é fechada.

Aplicação web do trabalho final de **Soluções Computacionais** (Universidade Católica de Brasília, 2026/2, prof. Andre Gustavo Bastos Lima). É o cliente do profissional de saúde na plataforma CareBridge, que reúne oportunidades de cuidado em saúde gratuitas, acessíveis ou direcionadas a públicos específicos.

O paciente usa o aplicativo iOS. Este painel é onde a instituição e o profissional acompanham o que publicaram e as candidaturas que receberam.

Repositórios irmãos: [mobile](https://github.com/LuisFontinelles/trabalho-andre-mobile) · [backend](https://github.com/LuisFontinelles/trabalho-andre-backend).

## Estado atual

O backend ainda não existe. A aplicação roda inteira sobre um servidor simulado por fixtures, exercitando o caminho real de rede: montagem da URL, código de status, decodificação e tratamento de erro. Apontar para a API de verdade é não instalar o interceptador.

| Área | Situação |
|---|---|
| Login | Pronto, sobre fixture |
| Cadastro de profissional, com conselho e registro | Pronto, com validação completa |
| Verificação por código de 4 dígitos | Pronto |
| Minhas oportunidades, com indicadores e tabela | Pronto |
| Encerrar e excluir oportunidade | Pronto |
| Nova oportunidade, nos três passos do protótipo | Pronto |
| Editar oportunidade | Pronto |
| Triagem: perguntas editáveis e documentos exigidos | Pronto |
| Solicitações recebidas, com filtro por status | Pronto |
| Detalhe da solicitação: triagem, documentos, decisão e mensagens | Pronto |
| Abrir documento anexado | **Desativado e marcado** |
| Recuperação de senha | **Desativada e marcada** |

As telas seguem o protótipo do profissional entregue pelo grupo: tabela de oportunidades com status e ações por linha, solicitações com chips de contagem, e o formulário em três passos.

Recursos ainda não construídos ficam visíveis e explicitamente desabilitados, em vez de escondidos. É a mesma regra adotada no aplicativo iOS: dá para enxergar o que falta usando a aplicação, sem abrir o código.

## Rodar na própria máquina

Só é necessário para mexer no código. Para apenas ver o sistema, use o link acima.

Requer Node 22 ou superior.

```bash
npm install
npm run dev
```

### Contas de teste

| Perfil | E-mail | Senha |
|---|---|---|
| Profissional de saúde | `profissional@teste.com` | qualquer senha não vazia |
| Paciente | `paciente@teste.com` | qualquer senha não vazia |

Qualquer outro e-mail é recusado com 401, de propósito, para exercitar o estado de erro.

**Código de verificação:** `0000`. Qualquer outro devolve 401.

O cadastro aceita e-mails novos: o registro fica guardado em memória e a verificação devolve o perfil e o nome cadastrados.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos e build de produção |
| `npm run test` | Testes unitários |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run lint` | ESLint |

## Testes

266 testes em Vitest, com **95,8% de cobertura de linhas** em domínio e camada de dados.

| Suíte | O que cobre |
|---|---|
| `validation` | E-mail, senha e as regras do cadastro, na ordem dos campos |
| `entities` | Vagas, critérios de busca, perfis e valores desconhecidos |
| `professional` | Status, ações permitidas por status, resumo do painel, filtros e tempo relativo |
| `opportunityDraft` | Os três passos do formulário, campo a campo |
| `triage` | Modos da triagem, perguntas e documentos exigidos |
| `network` | Montagem de URL, casamento de rotas e cada código de erro |
| `repositories` | Login, cadastro, verificação, busca e candidatura |
| `professionalRepository` | Criar, editar, encerrar, excluir, decidir e responder |

O estado do mock é reiniciado antes e depois de cada teste, então nenhum teste depende do que outro deixou.

Cobertura local:

```bash
npm run test:coverage
```

## Arquitetura

A mesma do aplicativo iOS: Clean Architecture, com as dependências apontando sempre para dentro.

```
src/
├── app/              composição de dependências, rotas, sessão
├── domain/           entidades, protocolos de repositório, casos de uso
├── data/             DTOs, mappers, cliente HTTP, repositórios, backend simulado
├── presentation/     uma pasta por tela
├── designSystem/     tokens e componentes
└── resources/        textos e fixtures JSON
```

O domínio não importa React. Quando uma decisão visual depende de uma regra, o domínio expõe um conceito próprio e o design system faz a tradução, como em `vacancyLevel`, que devolve um nível e não uma cor.

### Design system

Os tokens espelham os do aplicativo iOS, então as duas interfaces falam a mesma língua visual.

- **Cor**: paleta primitiva e tokens semânticos, ambos com valor claro e escuro. Nenhum componente usa a paleta diretamente, e o modo escuro sai sem trabalho por tela.
- **Ícone**: nomes semânticos em `CbIcon`. Trocar por um pacote de ícones depois mexe só nesse arquivo.
- **Espaçamento, raio, tamanho e tipografia**: variáveis CSS em um lugar só.
- **Textos**: todos em `resources/strings.ts`, agrupados por tela.

### Camada de rede

O corpo de erro é o mesmo acordado com o backend:

```json
{
  "statusCode": 404,
  "message": "Not Found: user not found",
  "error": "Not Found",
  "requestId": "ddfd6adc-59d5-4ef0-a1f1-7bc904c9b17e"
}
```

Rotas dedicadas a exercitar o tratamento de erro: `/v1/debug/no-content` (204), `/v1/debug/bad-request` (400), `/v1/debug/unauthorized` (401), `/v1/debug/not-found` (404) e `/v1/debug/server-error` (500).

O contrato completo da API está documentado em `CONTRATO-API-CareBridge.md`, na raiz do projeto.

## Integração contínua

Dois workflows rodam a cada push na `main`: o `ci.yml`, descrito abaixo, e o `pages.yml`, que publica o site.

O workflow em `.github/workflows/ci.yml` roda a cada push e pull request na `main`, em dois jobs paralelos:

| Job | O que faz |
|---|---|
| **Testes unitários** | Checagem de tipos, testes com cobertura, resumo da cobertura no painel do workflow e relatório guardado como artefato |
| **Lint e build** | ESLint e build de produção, com o `dist` guardado como artefato |

A tabela de cobertura aparece no resumo da execução, sem precisar baixar o artefato.

## Documentação

| Onde | O que tem |
|---|---|
| [Wiki](https://github.com/LuisFontinelles/trabalho-andre-web/wiki) | Arquitetura, design system, backend simulado e fluxo de trabalho |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como abrir um PR sem quebrar as regras de camada |
| [CONTRATO-API-CareBridge.md](CONTRATO-API-CareBridge.md) | Rotas, formatos e códigos de status acordados com o backend |

## Equipe

João Victor Medeiros Silva · Raquel Souza · Luis Filipe Fontinelles · Natália Jesus · Pedro Paulo Sousa · Sara Cristina
