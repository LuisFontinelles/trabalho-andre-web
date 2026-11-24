# Ambiente e contas de teste

## Rodar

Requer Node 22 ou superior.

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`.

## Contas

A aplicação usa a API real. Use uma conta profissional existente no ambiente configurado ou faça o cadastro pela própria aplicação. As credenciais disponíveis dependem do banco de dados do backend.

`profissional@teste.com` e `paciente@teste.com` existem somente no servidor simulado usado pelos testes automatizados. Elas não são contas garantidas na API real nem no site publicado.

## Código de verificação

O código é enviado pelo backend real. O valor `0000` é aceito somente pelo servidor simulado da suíte automatizada.

## Cadastro com e-mail novo

O cadastro envia os dados para a API real. A persistência, verificação e liberação do profissional seguem as regras do backend configurado.

No cadastro de profissional, escolha qualquer conselho e UF; o número do registro tem de 4 a 7 dígitos. A conta nova nasce em verificação: salva rascunho, mas não publica.

## O que esperar

A sessão é preservada durante a aba atual. Recarregar a página mantém o acesso enquanto a sessão for válida.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos e build de produção |
| `npm run test` | Testes unitários |
| `npm run test:watch` | Testes em modo observador |
| `npm run test:coverage` | Testes com cobertura |
| `npm run lint` | ESLint |
