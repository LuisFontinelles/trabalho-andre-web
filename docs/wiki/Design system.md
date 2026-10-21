# Design system

Os tokens espelham os do aplicativo iOS, então as duas interfaces falam a mesma língua visual sem ninguém precisar comparar telas lado a lado.

A regra é uma só: **nenhuma tela declara cor, espaçamento, raio, tipografia ou ícone.** Tudo vem de token.

## Cor

Duas camadas, em `src/designSystem/tokens/tokens.css`.

A **paleta primitiva** tem os valores brutos: `--cb-green-700`, `--cb-neutral-200`. Ninguém usa isso direto.

Os **tokens semânticos** dão nome ao uso: `--cb-brand`, `--cb-text-secondary`, `--cb-danger-surface`. É o que os componentes consomem.

Cada token semântico tem valor claro e escuro. O modo escuro redefine só a camada semântica, então ele sai de graça sem nenhuma tela saber que existe.

```css
.cb-badge--danger {
  background: var(--cb-danger-surface);
  color: var(--cb-danger);
}
```

## Ícone

`CbIcon` em `src/designSystem/tokens/icons.tsx` dá nomes semânticos: `CbIcon.search`, `CbIcon.locked`, `CbIcon.verified`.

O resto da aplicação nunca conhece o desenho, só o nome. Se o projeto adotar um pacote de ícones depois, esse arquivo é o único que muda.

```tsx
<CbIcon.opportunity size={24} />
```

## Espaçamento, raio e tamanho

Escala fixa, em passos previsíveis.

| Token | Valor |
|---|---|
| `--cb-space-xs` | 4px |
| `--cb-space-sm` | 8px |
| `--cb-space-md` | 12px |
| `--cb-space-lg` | 16px |
| `--cb-space-xl` | 24px |
| `--cb-space-xxl` | 32px |

Alvos de toque usam `--cb-tap-target`, que é 44px, o mínimo recomendado para acessibilidade.

## Tipografia

Os tokens de fonte vêm completos, com peso, tamanho e altura de linha juntos:

```css
font: var(--cb-font-body-strong);
```

## Textos

Todo texto de interface mora em `src/resources/strings.ts`, agrupado por tela. Nenhuma string solta no meio de um componente.

Isso prepara tradução e, mais imediato, deixa revisar a redação de todas as telas em um arquivo só.

## Componentes

Em `src/designSystem/components/index.tsx`. Todos aceitam os estados que a tela precisa: carregando, erro, desabilitado.

| Componente | Para quê |
|---|---|
| `Button` | Ação principal, secundária, terciária e destrutiva |
| `TextField` | Entrada de texto, com revelar senha e estado de erro |
| `SelectField` | Seleção, com a seta vindo do token de ícone |
| `OptionSelector` | Par de opções em pílula, como o "Eu sou" do cadastro |
| `Checkbox` | Aceite de termos |
| `CodeField` | Código de verificação de 4 dígitos |
| `Chip` | Filtro de especialidade |
| `Badge` | Selo de vagas, com tom por nível |
| `Card`, `KeyValueRow` | Agrupamento de conteúdo |
| `Banner` | Aviso de erro, alerta, informação ou sucesso |
| `EmptyState` | Lista vazia ou falha, com ação de repetir |
| `Skeleton` | Carregamento |
| `DisabledTag` | Marca o que está em construção |

## Recurso desativado

Quando algo ainda não funciona, o controle fica na tela, desabilitado, com o motivo visível:

```tsx
<Button
  title={strings.opportunities.newOpportunity}
  isEnabled={false}
  disabledHint={strings.publish.unavailable}
/>
```

Esconder o recurso seria mais limpo visualmente e pior na prática: ninguém consegue ver o que falta sem ler o código.
