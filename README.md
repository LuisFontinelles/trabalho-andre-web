# CareBridge · painel web do profissional

[![CI](https://github.com/LuisFontinelles/trabalho-andre-web/actions/workflows/ci.yml/badge.svg)](https://github.com/LuisFontinelles/trabalho-andre-web/actions/workflows/ci.yml)
[![Pages](https://github.com/LuisFontinelles/trabalho-andre-web/actions/workflows/pages.yml/badge.svg)](https://github.com/LuisFontinelles/trabalho-andre-web/actions/workflows/pages.yml)

## 🔗 Abrir o site

**https://luisfontinelles.github.io/trabalho-andre-web/**

Não precisa instalar nada: o site roda no navegador e usa a API real. Para entrar, use uma conta profissional cadastrada nesse ambiente ou crie uma pela tela **Criar conta de profissional**. As antigas credenciais `profissional@teste.com` e código `0000` pertencem apenas aos testes automatizados e não funcionam no site publicado.

A sessão dura enquanto a aba estiver aberta, então recarregar a página não desloga. O que você criar ou alterar é persistido pela API conforme as regras do backend.

Aplicação web do trabalho final de **Soluções Computacionais** (Universidade Católica de Brasília, 2026/2, prof. Andre Gustavo Bastos Lima). É o cliente do profissional de saúde na plataforma CareBridge, que reúne oportunidades de cuidado em saúde gratuitas, acessíveis ou direcionadas a públicos específicos.

O paciente usa o aplicativo iOS. Este painel é onde a instituição e o profissional acompanham o que publicaram e as candidaturas que receberam.

Repositórios irmãos: [mobile](https://github.com/LuisFontinelles/trabalho-andre-mobile) · [backend](https://github.com/LuisFontinelles/trabalho-andre-backend).

## Estado atual

O painel fala o [contrato da API, versão 2](CONTRATO-API-CareBridge.md): caminhos sem `/v1`, nomes em português, valores fechados em MAIÚSCULAS e erro `{status, message}`, igual ao app iOS. A aplicação usa a API real em todos os fluxos. O servidor simulado por fixtures fica restrito aos testes automatizados.

| Área | Situação |
|---|---|
| Login | Pronto, integrado à API |
| Cadastro de profissional, com conselho e registro | Pronto, com validação completa |
| Verificação por código de 4 dígitos, com reenvio cronometrado | Pronto |
| Cadastro em verificação, com aviso no painel | Pronto |
| Recuperação de senha | Pronto, integrada à API |
| Minhas oportunidades: indicadores, tabela e estados vazio, carregando e erro | Pronto |
| Encerrar oportunidade e excluir rascunho, com confirmação | Pronto |
| Nova oportunidade, nos três passos do protótipo | Pronto |
| Salvar rascunho e tela de oportunidade publicada | Pronto |
| Editar oportunidade | Pronto |
| Triagem: perguntas com tipo de resposta e documentos exigidos | Pronto |
| Triagem padrão do contrato: 8 perguntas, com as condicionais de diagnóstico e medicação | Pronto |
| Solicitações recebidas, com os 6 estados e filtro por estado | Pronto |
| Detalhe da solicitação: triagem, documentos, decisão e mensagens | Pronto |
| Aprovar, recusar com motivo e pedir informações | Pronto |
| Combinado da aprovação (quando, onde, levar) | Pronto, com campos opcionais; vazios usam "A combinar" |
| Abrir documento anexado | Pronto, com a pré-visualização do protótipo |
| Baixar documento anexado | **Desativado e marcado** |
| Configurações: perfil, tema claro e escuro, avisos e dados da conta | Pronto |
| Ver a oportunidade como paciente | **Desativado e marcado** |

As telas seguem o protótipo do Figma nas três larguras: **desktop** (1440, menu lateral completo), **tablet** (834, trilho de ícones) e **mobile** (390, barra superior e menu recolhido). No mobile as tabelas viram cartões e as linhas de campos viram colunas. Os tokens de cor, espaço e raio, a escala de texto em Inter e os ícones Material Symbols Rounded são os do arquivo de design, com tema claro e escuro.

Recursos ainda não construídos ficam visíveis e explicitamente desabilitados, em vez de escondidos. É a mesma regra adotada no aplicativo iOS: dá para enxergar o que falta usando a aplicação, sem abrir o código.

## Rodar na própria máquina

Só é necessário para mexer no código. Para apenas ver o sistema, use o link acima.

Requer Node 22 ou superior.

```bash
npm install
npm run dev
```

### API real

Todos os fluxos falam com a API configurada em `VITE_API_URL`. Sem essa variável, a aplicação usa o backend publicado no Render. As contas e credenciais disponíveis dependem do ambiente do backend.

```bash
cp .env.example .env.local   # VITE_API_URL=/api
npm run dev
```

A API pode ser acessada pelo proxy de desenvolvimento: o `npm run dev` repassa `/api/*` para o destino configurado. Para apontar para a API rodando na sua máquina, defina `API_PROXY_TARGET=http://localhost:8080` no `.env.local`.

| Tela | Rota da API | Observação |
|---|---|---|
| Login | `POST /user/login` e, logo depois, `GET /user/me` | O nome vem do `/user/me`. Perfis não profissionais mantêm a sessão, mas o guard bloqueia o painel. |
| Cadastro | `POST /profissional-saude/cadastro` (multipart, partes `dados` e `documentos`) | Envia registro, especialidade, local de atendimento, biografia e até 2 documentos. |

Recuperação de senha, catálogo, oportunidades, solicitações, configurações e decisões usam os respectivos endpoints reais. Fixtures e `createMockFetch()` são usados somente pela suíte automatizada.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos e build de produção |
| `npm run test` | Testes unitários |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run lint` | ESLint |

## Testes

454 testes em Vitest, com **98,1% de cobertura de linhas** em domínio e camada de dados.

| Suíte | O que cobre |
|---|---|
| `validation` | E-mail, senha e as regras do cadastro, na ordem dos campos |
| `entities` | Perfis e cadastro |
| `professional` | Os 6 estados, atrasada, ações por status, resumo, filtros, combinado e tempo relativo |
| `opportunityDraft` | Os três passos do formulário, campo a campo |
| `triage` | Formulário padrão do contrato, condicionais, perguntas e documentos exigidos |
| `network` | URL sem `/v1`, token Bearer, 401 que encerra a sessão, cada código de erro e as fixtures |
| `repositories` | Login com `/user/me`, bloqueio por tentativas, cadastro, verificação e catálogo |
| `carebridgeApi` | Login e cadastro na API real, com o nome tirado do e-mail quando `/user/me` falha |
| `professionalMappers` | Ida e volta entre o domínio e o contrato, com as fixtures |
| `professionalRepository` | Criar, editar, encerrar, excluir, decidir, pedir informação e mensagens, com as regras de 400, 403 e 409 |

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

O domínio não importa React. Quando uma decisão visual depende de uma regra, o domínio expõe um conceito próprio e o design system faz a tradução, como em `REQUEST_STATUS_TONE`, que devolve um tom e não uma cor.

### Design system

Os tokens espelham os do aplicativo iOS, então as duas interfaces falam a mesma língua visual.

- **Cor**: paleta primitiva e tokens semânticos, ambos com valor claro e escuro. Nenhum componente usa a paleta diretamente, e o modo escuro sai sem trabalho por tela.
- **Ícone**: nomes semânticos em `CbIcon`. Trocar por um pacote de ícones depois mexe só nesse arquivo.
- **Espaçamento, raio, tamanho e tipografia**: variáveis CSS em um lugar só.
- **Textos**: todos em `resources/strings.ts`, agrupados por tela.

### Camada de rede

Só a camada de dados fala português: os DTOs (`src/data/dto`, `src/data/professionalDto.ts`) espelham o contrato, e os mappers traduzem para o domínio, que segue em inglês. Valor fechado vai em MAIÚSCULAS no fio e em minúsculas no domínio (`PRECO_SOCIAL` ↔ `preco-social`).

As rotas com cadeado levam `Authorization: Bearer <token>`. Um 401 numa delas encerra a sessão e volta para o login; 403 é falta de permissão e não desloga.

O corpo de erro é o do contrato, com os campos do Spring junto:

```json
{
  "status": 409,
  "message": "Já existe um usuário cadastrado com este e-mail.",
  "error": "Conflict",
  "path": "/profissional-saude/cadastro",
  "timestamp": "2026-11-19T02:52:06Z"
}
```

O `NetworkError` separa `unauthorized` (401), `forbidden` (403), `notFound` (404), `conflict` (409), `tooManyAttempts` (429), `badRequest` (400) e `server`, e as telas mostram a `message` quando ela explica o que fazer.

Rotas dedicadas a exercitar o tratamento de erro: `/debug/no-content` (204), `/debug/bad-request` (400), `/debug/unauthorized` (401), `/debug/forbidden` (403), `/debug/not-found` (404), `/debug/conflict` (409), `/debug/too-many` (429) e `/debug/server-error` (500).

O contrato completo está em `CONTRATO-API-CareBridge.md`, na raiz do projeto.

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
