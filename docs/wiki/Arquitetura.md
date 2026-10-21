# Arquitetura

Clean Architecture com as dependências apontando sempre para dentro. É a mesma estrutura do aplicativo iOS, o que permite que quem trabalhou em um lado entenda o outro sem reaprender tudo.

## Camadas

```
src/
├── app/              composição de dependências, rotas, sessão
├── domain/           entidades, protocolos de repositório, casos de uso
├── data/             DTOs, mappers, cliente HTTP, repositórios, backend simulado
├── presentation/     uma pasta por tela
├── designSystem/     tokens e componentes
└── resources/        textos e fixtures JSON
```

```
app  →  presentation  →  domain  ←  data
                             ↑
                      designSystem
```

## A regra

**Nenhuma camada de fora é citada por uma camada de dentro.**

Nada em `src/domain/` importa React, `fetch`, um DTO ou um componente. Quando o domínio precisa de dados, ele declara um protocolo em `domain/repositories` e a camada de dados o cumpre.

O ganho prático é que trocar o backend, a biblioteca de rede ou a própria interface não toca em uma linha de regra de negócio. E o domínio pode ser testado sem subir navegador nem servidor.

## Domínio

Entidades são tipos simples, sem comportamento escondido. As regras ficam em funções puras ao lado delas.

```ts
export function vacancyLevel(item: Opportunity): VacancyLevel {
  if (item.vacancies === 0) return 'none'
  return item.vacancies <= 5 ? 'low' : 'plenty'
}
```

Repare que isso devolve um nível, não uma cor. **O domínio expõe conceitos, não aparência.** Quem decide que `low` é amarelo é o design system.

Casos de uso são fábricas que recebem o repositório e devolvem uma função. Eles validam antes de chamar a rede, então um formulário inválido nunca gera requisição.

## Dados

Os DTOs espelham exatamente o que a API envia. Os mappers convertem DTO em entidade e protegem o domínio de mudanças no formato da API.

Valores desconhecidos caem em um padrão seguro em vez de quebrar:

```ts
export function modalityFrom(raw: string): Modality {
  return raw === 'online' ? 'online' : 'presencial'
}
```

Uma versão nova do backend não derruba a aplicação em produção.

## Apresentação

Uma pasta por tela. O estado fica em `useState` dentro do componente de página, e as chamadas passam pelos casos de uso vindos do contexto de dependências.

Não há biblioteca de estado global. A sessão e a pilha de rotas são o único estado compartilhado, e vivem em contexto React.

## Composição

`src/app/dependencies.ts` é a raiz de composição, equivalente ao `AppDependencies` do iOS. Ela monta o cliente HTTP, os repositórios e os casos de uso, e o resto da aplicação só recebe o que precisa.

Isso é o que torna o teste simples: o teste monta as mesmas dependências com um `fetch` sem latência.
