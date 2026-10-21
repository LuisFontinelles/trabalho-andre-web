# CareBridge · painel web do profissional

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
| Painel com indicadores | Pronto |
| Lista de oportunidades, busca, filtro e paginação | Pronto |
| Candidaturas com linha do tempo e triagem | Pronto |
| Publicar nova oportunidade | **Desativado e marcado na tela** |
| Recuperação de senha | **Desativada e marcada** |

Recursos ainda não construídos ficam visíveis e explicitamente desabilitados, em vez de escondidos. É a mesma regra adotada no aplicativo iOS: dá para enxergar o que falta usando a aplicação, sem abrir o código.

## Rodar

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

112 testes em Vitest, cobrindo validação de formulários, regras de domínio, montagem de requisição, mapeamento DTO para domínio, integridade das fixtures e os fluxos de autenticação, busca e candidatura contra o servidor simulado.

O estado do mock é reiniciado antes e depois de cada teste.

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

O workflow em `.github/workflows/ci.yml` roda a cada push e pull request na `main`: checagem de tipos, lint, testes e build de produção, guardando o resultado do build como artefato.

## Equipe

João Victor Medeiros Silva · Raquel Souza · Luis Filipe Fontinelles · Natália Jesus · Pedro Paulo Sousa · Sara Cristina
