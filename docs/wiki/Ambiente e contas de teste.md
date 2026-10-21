# Ambiente e contas de teste

## Rodar

Requer Node 22 ou superior.

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`.

## Contas

O backend ainda não existe. Estas duas contas são aceitas pelo servidor simulado.

| Perfil | E-mail | Senha |
|---|---|---|
| Profissional de saúde | `profissional@teste.com` | qualquer senha não vazia |
| Paciente | `paciente@teste.com` | qualquer senha não vazia |

Não existe senha certa: o mock só valida o e-mail. Qualquer outro endereço é recusado com 401, de propósito, para dar como exercitar a tela de erro.

A convenção usada nos testes automatizados é `Profissa@2026` e `Paciente@2026`, caso você queira padronizar.

## Código de verificação

**`0000`.** Qualquer outro código devolve 401 e mostra "Código incorreto".

## Cadastro com e-mail novo

O cadastro aceita endereços que não estão na lista. O registro fica guardado em memória enquanto a aba estiver aberta, e a verificação devolve o perfil e o nome que você cadastrou.

No cadastro de profissional, os dados do conselho são livres: escolha qualquer conselho, qualquer UF e qualquer número de registro.

## O que esperar

A sessão vive em memória. Recarregar a página desloga, igual ao aplicativo iOS. Navegue pelos links da barra lateral em vez de digitar a URL.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos e build de produção |
| `npm run test` | Testes unitários |
| `npm run test:watch` | Testes em modo observador |
| `npm run test:coverage` | Testes com cobertura |
| `npm run lint` | ESLint |
