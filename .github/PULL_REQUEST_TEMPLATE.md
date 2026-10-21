## O que muda

<!-- Uma ou duas frases sobre o que este PR faz. Se fecha uma issue, escreva "Fecha #12". -->

## Por que

<!-- O problema que isso resolve, ou o item do backlog que atende. -->

## Como testar

<!-- Passo a passo para quem revisa conferir na propria maquina. -->

1. `npm install`
2. `npm run dev`
3.

## Telas

<!-- Antes e depois, quando a mudanca aparece na interface. Arraste as imagens aqui. -->

| Antes | Depois |
| --- | --- |
|  |  |

## Checklist

- [ ] `npm run test` passa
- [ ] `npm run lint` passa
- [ ] `npx tsc -b` passa
- [ ] Testei no modo claro e no escuro
- [ ] Testei em tela estreita (menos de 860px)
- [ ] Nao usei cor, espacamento ou tipografia fora dos tokens
- [ ] Texto novo de interface foi para `src/resources/strings.ts`
- [ ] Recurso que ainda nao funciona ficou visivel e marcado como desativado

## Camadas tocadas

<!-- Marque as que o PR altera. A dependencia aponta sempre para o dominio. -->

- [ ] `domain` (entidades, casos de uso)
- [ ] `data` (DTOs, mappers, rede)
- [ ] `presentation` (telas)
- [ ] `designSystem` (tokens, componentes)
- [ ] Infra (CI, build, configuracao)

## Contrato da API

- [ ] Nao mexe no contrato
- [ ] Mexe no contrato, e avisei a frente de backend

<!-- Se mexe, diga o que muda: rota, campo, tipo ou codigo de status. -->
