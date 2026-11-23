# CareBridge · Contrato da API (versão 2)

Versão 2, de 19/11/2026. Substitui a versão de 21/10, que usava `/v1` e nomes em inglês.

A API segue o desenho do `carebridge-api` (Spring Boot): caminhos sem prefixo, nomes em português, perfil `PROFISSIONAL_SAUDE`. O app iOS e o painel web foram ajustados a este formato, e os servidores simulados dos dois respondem exatamente como está aqui. Quando uma rota real passar a responder igual, o cliente aponta para ela sem mudar código de tela.

Cada rota diz se **já existe** no backend, se **existe com outro formato** ou se é **nova**. A ordem de implementação sugerida está no fim.

---

## 1. Convenções

| Item | Valor |
| --- | --- |
| Caminho base | raiz, sem prefixo (`https://carebridge-api-2.onrender.com/oportunidades`) |
| Formato | JSON, UTF-8. Cadastro de profissional em `multipart/form-data` |
| Autenticação | `Authorization: Bearer <token>` em toda rota marcada com 🔒 |
| Datas com hora | ISO 8601 com fuso, como `2026-11-11T17:32:00Z` (`Instant`) |
| Datas sem hora | `aaaa-mm-dd` (`LocalDate`) |
| Identificadores | texto opaco; o backend usa UUID |
| Valores fechados | em MAIÚSCULAS com `_`, como os enums Java (`PRECO_SOCIAL`) |
| Especialidade | identificador do catálogo em minúsculas (`cardiologia`, `clinica-geral`) |
| Lista paginada | `Page` do Spring: `{content, number, size, totalPages, totalElements}`, `number` começa em 0 |
| Parâmetros de página | `page` (começa em 0) e `size` |
| CORS | liberar `https://luisfontinelles.github.io` e `http://localhost:5173` |

### Status

| Código | Quando |
| --- | --- |
| 200 | sucesso com corpo |
| 201 | criado |
| 202 | pedido aceito para processar depois (cópia dos dados) |
| 204 | sucesso sem corpo |
| 400 | corpo ou parâmetro inválido |
| 401 | sem token, token inválido ou vencido, **senha errada** |
| 403 | autenticado, mas sem permissão para aquilo |
| 404 | não existe ou não pertence a quem pediu |
| 409 | conflito: e-mail já cadastrado, pedido em dobro, sem vagas, estado que não permite a ação |
| 429 | login bloqueado depois de 5 senhas erradas seguidas, por 15 minutos |
| 500 | erro inesperado |

Os clientes tratam 401 como sessão vencida: pedem login de novo e guardam o rascunho. Por isso 401 e 403 precisam ser distintos.

### Corpo de erro

Todo erro, em qualquer rota, tem pelo menos `status` e `message`. Os campos padrão do Spring podem vir junto.

```json
{
  "status": 409,
  "message": "Já existe um usuário cadastrado com este e-mail.",
  "error": "Conflict",
  "path": "/paciente/cadastro",
  "timestamp": "2026-11-19T02:52:06Z"
}
```

`message` é mostrada ao usuário em parte dos casos, então vai em português e sem detalhe técnico.

---

## 2. Valores fechados

| Campo | Valores |
| --- | --- |
| `tipoPerfil` | `PACIENTE`, `PROFISSIONAL_SAUDE`, `ADMIN` |
| `situacaoRegistro` | `EM_VERIFICACAO`, `VERIFICADO`, `RECUSADO` |
| `tipoServico` | `CONSULTA`, `EXAME`, `TERAPIA`, `PROCEDIMENTO`, `GRUPO` |
| `modalidade` | `PRESENCIAL`, `ONLINE`, `HIBRIDO` |
| `modalidadeAcesso` | `GRATUITO`, `SUS`, `PRECO_SOCIAL`, `PESQUISA` |
| `publicoAlvo` (lista) | `CRIANCAS`, `ADOLESCENTES`, `ADULTOS`, `IDOSOS`, `GESTANTES` |
| `formaContato` | `PLATAFORMA`, `TELEFONE`, `EMAIL` |
| `status` da oportunidade | `RASCUNHO`, `ATIVA`, `ENCERRADA` |
| `status` da inscrição | `RECEBIDA`, `EM_ANALISE`, `AGUARDANDO_INFORMACOES`, `APROVADA`, `RECUSADA`, `CANCELADA` |
| `triagem.modo` | `PADRAO`, `PERSONALIZADO` |
| `pergunta.tipo` | `TEXTO_CURTO`, `TEXTO_LONGO`, `SIM_NAO`, `MULTIPLA` |
| `mensagem.autor` | `PACIENTE`, `PROFISSIONAL_SAUDE` |

Valor desconhecido não quebra os clientes: cada um cai num padrão seguro. Mesmo assim, valor novo precisa ser combinado antes.

---

## 3. Acesso

### POST /user/login · existe com outro formato

```json
{ "email": "paciente@teste.com", "password": "Senha2026" }
```

Resposta 200:

```json
{
  "token": "eyJhbGciOi...",
  "autenticado": true,
  "tipoPerfil": "PACIENTE",
  "validadoInstitucionalmente": false,
  "expiraEmSegundos": 7200
}
```

Muda: `expiraEmSegundos` é novo; senha errada passa a ser 401, e 429 depois de 5 erros seguidos.

### GET /user/me 🔒 · nova

Os clientes chamam logo depois do login para ter nome e dados da tela de perfil.

```json
{
  "id": "6f1c...",
  "email": "paciente@teste.com",
  "tipoPerfil": "PACIENTE",
  "nome": "Ana Souza",
  "dataNascimento": "1988-03-12",
  "telefone": "61999990000",
  "situacaoRegistro": null
}
```

Para `PROFISSIONAL_SAUDE`, o mesmo objeto traz o registro, que o painel mostra na barra lateral e na faixa de "cadastro em verificação":

```json
{
  "id": "9b3d...",
  "email": "profissional@teste.com",
  "tipoPerfil": "PROFISSIONAL_SAUDE",
  "nome": "Marcos Vieira",
  "situacaoRegistro": "VERIFICADO",
  "conselho": "CRM",
  "uf": "DF",
  "numeroRegistro": "123456",
  "especialidade": "cardiologia",
  "ondeAtende": "Instituto Movida"
}
```

`situacaoRegistro`, `conselho`, `uf`, `numeroRegistro`, `especialidade` e `ondeAtende` só vêm para `PROFISSIONAL_SAUDE`. `dataNascimento` e `telefone` só para `PACIENTE`. Campo que não se aplica vem nulo ou ausente.

### POST /paciente/cadastro · existe com outro formato

```json
{
  "usuarioDto": { "email": "ana@email.com", "senha": "Senha2026", "tipoPerfil": "PACIENTE" },
  "nome": "Ana Souza",
  "dataNascimento": "1988-03-12",
  "telefone": "61999990000",
  "endereco": null,
  "aceitouTermos": true
}
```

Resposta 201:

```json
{ "email": "ana@email.com", "tipoPerfil": "PACIENTE", "exigeVerificacao": true, "tamanhoCodigo": 4 }
```

Regras: o servidor ignora o `tipoPerfil` enviado e grava sempre `PACIENTE` (hoje aceita `ADMIN`). 409 se o e-mail existe. 400 se `aceitouTermos` for falso ou se a pessoa tiver menos de 18 anos. `telefone` é opcional, só dígitos.

`exigeVerificacao: false` significa que a conta já nasce ativa: o cliente faz login direto. Enquanto o código por e-mail não existir, o backend devolve `false` (ou 201 sem corpo, que os clientes leem como `false`).

### POST /profissional-saude/cadastro · existe com outro formato

`multipart/form-data` com a parte `dados` (JSON, `Content-Type: application/json`) e até 2 arquivos na parte `documentos`.

```json
{
  "usuarioDto": { "email": "mariana@clinica.com", "senha": "Senha2026", "tipoPerfil": "PROFISSIONAL_SAUDE" },
  "nome": "Mariana Costa",
  "conselho": "CRM",
  "uf": "DF",
  "numeroRegistro": "123456",
  "especialidade": "cardiologia",
  "ondeAtende": "Instituto Movida",
  "biografiaOuDescricao": null,
  "aceitouTermos": true
}
```

Resposta 201 igual à do paciente, com `"tipoPerfil": "PROFISSIONAL_SAUDE"`. O profissional nasce com `situacaoRegistro: EM_VERIFICACAO`.

Muda: `conselho`, `uf`, `numeroRegistro`, `especialidade` e `ondeAtende` substituem `documentosRegistro` (que hoje é descartado no serviço). `numeroRegistro` tem de 4 a 7 dígitos. 409 se o e-mail existe.

### POST /user/verificacao · nova (etapa 4)

```json
{ "email": "ana@email.com", "codigo": "0000" }
```

Resposta 200 igual à do login. 401 se o código está errado ou venceu.

### POST /user/verificacao/reenvio · nova (etapa 4)

`{ "email": "ana@email.com" }` → 204.

### POST /user/senha/recuperacao · nova (etapa 4)

`{ "email": "ana@email.com" }` → 204, exista ou não a conta (a resposta não pode revelar quem tem cadastro). O link vale 30 minutos.

---

## 4. Catálogo

### GET /catalogos · nova, pública, pode ser estática

```json
{
  "especialidades": [
    { "id": "cardiologia", "nome": "Cardiologia" },
    { "id": "clinica-geral", "nome": "Clínica geral" },
    { "id": "fisioterapia", "nome": "Fisioterapia" },
    { "id": "fonoaudiologia", "nome": "Fonoaudiologia" },
    { "id": "nutricao", "nome": "Nutrição" },
    { "id": "odontologia", "nome": "Odontologia" },
    { "id": "ortopedia", "nome": "Ortopedia" },
    { "id": "psicologia", "nome": "Psicologia" },
    { "id": "terapia-ocupacional", "nome": "Terapia ocupacional" }
  ],
  "conselhos": [
    { "sigla": "CRM", "profissao": "Medicina" },
    { "sigla": "COREN", "profissao": "Enfermagem" },
    { "sigla": "CRO", "profissao": "Odontologia" },
    { "sigla": "CRP", "profissao": "Psicologia" },
    { "sigla": "CREFITO", "profissao": "Fisioterapia e TO" },
    { "sigla": "CRN", "profissao": "Nutrição" },
    { "sigla": "CRF", "profissao": "Farmácia" },
    { "sigla": "CREFONO", "profissao": "Fonoaudiologia" },
    { "sigla": "CRESS", "profissao": "Serviço social" },
    { "sigla": "CREF", "profissao": "Educação física" },
    { "sigla": "CRBM", "profissao": "Biomedicina" }
  ],
  "ufs": ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"],
  "distanciasKm": [2, 5, 10]
}
```

---

## 5. Oportunidades

### Objeto `Oportunidade`

```json
{
  "id": "op-004",
  "titulo": "Cardiologia, vaga social",
  "descricao": "Avaliação cardiológica com ECG, voltada a pacientes sem convênio. Requer triagem prévia.",
  "tipoServico": "CONSULTA",
  "especialidade": "cardiologia",
  "modalidade": "HIBRIDO",
  "modalidadeAcesso": "PRECO_SOCIAL",
  "preco": 40.0,
  "publicoAlvo": ["ADULTOS"],
  "publicoAlvoObservacao": "Adultos sem convênio",
  "vagasTotais": 10,
  "vagasPreenchidas": 5,
  "cep": "70000-000",
  "endereco": "Rua das Flores, 120",
  "cidade": "Brasília",
  "uf": "DF",
  "distanciaKm": 4.8,
  "inscricoesDe": "2026-11-01",
  "inscricoesAte": "2026-12-15",
  "criteriosElegibilidade": "Adultos sem convênio, moradores do DF.",
  "semRestricoes": false,
  "formaContato": "PLATAFORMA",
  "prazoRespostaDias": 15,
  "status": "ATIVA",
  "ultimaAtualizacao": "2026-11-08T15:00:00Z",
  "ofertante": {
    "id": "pr-004",
    "nome": "Dra. Mariana Costa",
    "conselho": "CRM",
    "uf": "DF",
    "numeroRegistro": "123456",
    "ondeAtende": "Instituto Movida",
    "verificado": true
  },
  "triagem": {
    "modo": "PADRAO",
    "perguntas": [ "... ver seção 6 ..." ],
    "documentosExigidos": [
      { "id": "rg", "rotulo": "RG" },
      { "id": "encaminhamento", "rotulo": "Encaminhamento médico" }
    ]
  },
  "totalInscricoes": 4
}
```

| Campo | Regra |
| --- | --- |
| `preco` | só em `PRECO_SOCIAL`, maior que zero; nulo nas outras |
| `cep`, `endereco` | obrigatórios em `PRESENCIAL` e `HIBRIDO`, nulos em `ONLINE` |
| `cidade`, `uf` | opcionais; o app mostra a cidade quando não há distância |
| `distanciaKm` | calculada para quem busca; pode vir nula (online, ou sem localização) |
| `descricao` | 40 a 600 caracteres |
| `vagasTotais` | 1 ou mais; vagas restantes = `vagasTotais - vagasPreenchidas` |
| `inscricoesAte` | depois de `inscricoesDe` |
| `criteriosElegibilidade` | obrigatório, a menos que `semRestricoes` seja verdadeiro |
| `prazoRespostaDias` | 15 por padrão |
| `ofertante.verificado` | igual a `validadoInstitucionalmente`; o selo de verificado só aparece com ele |
| `totalInscricoes` | só nas rotas do profissional dono; nulo na busca pública |

### GET /oportunidades · existe com outro formato

Pública (hoje exige token). Só oportunidades `ATIVA`, mais recentes primeiro.

| Parâmetro | Exemplo | Regra |
| --- | --- | --- |
| `q` | `psico` | procura em título, especialidade, nome do ofertante, `ondeAtende`, cidade e endereço, sem acento e sem caixa |
| `tipoServico` | `EXAME` | um valor |
| `especialidade` | `cardiologia,psicologia` | lista separada por vírgula |
| `modalidade` | `ONLINE` | um valor |
| `distanciaMaxKm` | `5` | `ONLINE` passa em qualquer raio |
| `modalidadeAcesso` | `GRATUITO,PRECO_SOCIAL` | lista |
| `publicoAlvo` | `ADULTOS,IDOSOS` | lista; casa quando há interseção |
| `page`, `size` | `0`, `6` | os clientes pedem 6 por página |

Resposta 200:

```json
{ "content": [ "... Oportunidade ..." ], "number": 0, "size": 6, "totalPages": 3, "totalElements": 14 }
```

### GET /oportunidades/{id} · existe com outro formato

Pública. 404 se não existe. Rascunho só aparece para o dono.

### GET /profissional-saude/oportunidades 🔒 · nova

"Minhas oportunidades": todas as do profissional logado, nos três estados, com `totalInscricoes`. Array, mais recentes primeiro.

### POST /oportunidades 🔒 · existe com outro formato

Profissional validado. Corpo = o objeto `Oportunidade` sem `id`, `ofertante`, `vagasPreenchidas`, `distanciaKm`, `ultimaAtualizacao` e `totalInscricoes`. `status` vai `RASCUNHO` (salvar rascunho) ou `ATIVA` (publicar). Rascunho aceita campos vazios; publicar valida tudo da tabela acima. Resposta 201 com a `Oportunidade`.

Profissional `EM_VERIFICACAO` pode criar `RASCUNHO`, mas não publicar: 403 com mensagem.

### PUT /oportunidades/{id} 🔒 · existe com outro formato

Mesmo corpo. Só o dono. 409 se a oportunidade está `ENCERRADA`.

### POST /oportunidades/{id}/encerrar 🔒 · nova

Só o dono, só `ATIVA`. Resposta 204. As inscrições abertas continuam até a decisão.

### DELETE /oportunidades/{id} 🔒 · existe

Só o dono e só `RASCUNHO` (409 nos outros estados). Resposta 204.

---

## 6. Triagem

O profissional escolhe o modo no passo 3 da criação. `PADRAO` usa o formulário abaixo, igual para todas as oportunidades. `PERSONALIZADO` usa as perguntas que ele escreveu. O app do paciente desenha qualquer um dos dois a partir de `triagem.perguntas`.

### Objeto `Pergunta`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | texto | único na oportunidade |
| `rotulo` | texto | a pergunta como aparece na tela |
| `tipo` | enum | `TEXTO_CURTO`, `TEXTO_LONGO`, `SIM_NAO`, `MULTIPLA` |
| `obrigatoria` | booleano | |
| `opcoes` | lista de texto | só em `MULTIPLA`, 2 ou mais |
| `permiteVarias` | booleano | só em `MULTIPLA`: aceita mais de uma opção |
| `minCaracteres`, `maxCaracteres` | int, opcionais | só em texto |
| `ajuda` | texto, opcional | linha de apoio abaixo da pergunta |
| `dependeDe` | `{perguntaId, resposta}`, opcional | a pergunta só aparece (e só é exigida) quando a outra tem aquela resposta |

### Formulário padrão

```json
[
  { "id": "motivo", "rotulo": "Qual o motivo principal?", "tipo": "TEXTO_LONGO", "obrigatoria": true, "minCaracteres": 10, "maxCaracteres": 300 },
  { "id": "tempo", "rotulo": "Há quanto tempo?", "tipo": "MULTIPLA", "obrigatoria": true, "opcoes": ["Menos de 1 semana", "De 1 a 4 semanas", "De 1 a 6 meses", "Mais de 6 meses"] },
  { "id": "diagnostico", "rotulo": "Já tem diagnóstico?", "tipo": "SIM_NAO", "obrigatoria": true },
  { "id": "qual-diagnostico", "rotulo": "Qual diagnóstico?", "tipo": "TEXTO_CURTO", "obrigatoria": true, "dependeDe": { "perguntaId": "diagnostico", "resposta": "Sim" } },
  { "id": "medicacao", "rotulo": "Usa medicação contínua?", "tipo": "SIM_NAO", "obrigatoria": true },
  { "id": "quais-medicacoes", "rotulo": "Quais medicações?", "tipo": "TEXTO_CURTO", "obrigatoria": true, "dependeDe": { "perguntaId": "medicacao", "resposta": "Sim" } },
  { "id": "urgencia", "rotulo": "Urgência percebida", "tipo": "MULTIPLA", "obrigatoria": true, "opcoes": ["Baixa", "Média", "Alta"], "ajuda": "Alta: atrapalha suas atividades do dia a dia." },
  { "id": "horario", "rotulo": "Melhor horário", "tipo": "MULTIPLA", "obrigatoria": false, "opcoes": ["Manhã", "Tarde", "Noite"], "permiteVarias": true }
]
```

`SIM_NAO` responde `"Sim"` ou `"Não"`. `MULTIPLA` responde a opção escolhida; com `permiteVarias`, as opções separadas por `", "` na ordem da lista.

### Documentos exigidos

Lista de `{id, rotulo}`. Os do catálogo do painel: `rg` RG, `cpf` CPF, `sus` Cartão do SUS, `encaminhamento` Encaminhamento médico, `residencia` Comprovante de residência, `renda` Comprovante de renda, `exames` Exames anteriores. Documento escrito pelo profissional ganha um `id` próprio (`outro-1`).

---

## 7. Inscrições (solicitação de vaga)

### Objeto `Inscricao`

O mesmo objeto atende paciente e profissional. `mensagensNaoLidas` conta as não lidas por quem pediu.

```json
{
  "id": "app-20377",
  "protocolo": "20377",
  "status": "AGUARDANDO_INFORMACOES",
  "oportunidade": { "id": "op-006", "titulo": "Fisioterapia ortopédica", "especialidade": "fisioterapia" },
  "ofertante": { "nome": "Dra. Camila Torres", "ondeAtende": "Boca Feliz" },
  "paciente": { "nome": "Ana Souza" },
  "dataInscricao": "2026-10-28T13:15:00Z",
  "prazoResposta": "2026-11-12T13:15:00Z",
  "decididaEm": null,
  "motivoDecisao": null,
  "pedidoInformacao": { "texto": "Pode enviar o raio X mais recente do joelho?", "prazo": "2026-11-15T02:59:00Z" },
  "combinado": null,
  "respostasTriagem": [
    { "perguntaId": "motivo", "pergunta": "Qual o motivo principal?", "resposta": "Dor no joelho direito ao caminhar" },
    { "perguntaId": "tempo", "pergunta": "Há quanto tempo?", "resposta": "De 1 a 6 meses" }
  ],
  "documentos": [
    { "id": "doc-1", "documentoId": "rg", "nomeArquivo": "RG.jpg", "tamanhoBytes": 1200000, "enviadoEm": "2026-10-28T13:15:00Z" }
  ],
  "consentimentoDadosSaudeEm": "2026-10-28T13:15:00Z",
  "mensagensNaoLidas": 0,
  "ultimaMensagem": null,
  "podeTrocarMensagens": false,
  "mensagens": null
}
```

| Campo | Regra |
| --- | --- |
| `protocolo` | número sequencial legível, único |
| `prazoResposta` | `dataInscricao` + `prazoRespostaDias` da oportunidade |
| "Atrasada" | não é estado: os clientes mostram quando `status` é `RECEBIDA` ou `EM_ANALISE` e passou do `prazoResposta` |
| `motivoDecisao` | obrigatório em `RECUSADA` |
| `combinado` | `{quando, onde, levar}`, preenchido na aprovação; pode ser "A combinar" |
| `podeTrocarMensagens` | verdadeiro só em `APROVADA` |
| `respostasTriagem` | o texto da pergunta vai junto, para a resposta continuar legível se a oportunidade mudar |
| `mensagens` | lista só no detalhe (`GET .../{id}`); nula nas listas |

### Paciente

| Rota | Estado | Corpo | Resposta |
| --- | --- | --- | --- |
| `GET /paciente/inscricoes` 🔒 | nova | | array de `Inscricao`, mais recentes primeiro |
| `GET /paciente/inscricoes/{id}` 🔒 | nova | | `Inscricao` com `mensagens`; 404 se não é dela |
| `POST /paciente/inscricoes` 🔒 | nova | ver abaixo | 201 `Inscricao` com `status: EM_ANALISE` |
| `POST /paciente/inscricoes/{id}/cancelar` 🔒 | nova | | 204; apaga documentos e respostas; 409 se já decidida |
| `POST /paciente/inscricoes/{id}/resposta` 🔒 | nova | `{texto, anexo: {nomeArquivo, tamanhoBytes} ou null}` | `Inscricao`, volta a `EM_ANALISE`; 409 se não há pedido de informação |
| `GET /paciente/inscricoes/{id}/mensagens` 🔒 | nova | | array de `Mensagem`; marca como lidas |
| `POST /paciente/inscricoes/{id}/mensagens` 🔒 | nova | `{texto}` | 201 `Mensagem`; 409 se não está `APROVADA` |
| `DELETE /paciente/inscricoes/{id}/documentos` 🔒 | nova | | 204 |

Corpo de `POST /paciente/inscricoes`:

```json
{
  "oportunidadeId": "op-006",
  "respostasTriagem": [
    { "perguntaId": "motivo", "pergunta": "Qual o motivo principal?", "resposta": "Dor no joelho direito ao caminhar" }
  ],
  "documentos": [
    { "documentoId": "rg", "nomeArquivo": "RG.jpg", "tamanhoBytes": 1200000 }
  ],
  "consentimentoDadosSaudeEm": "2026-10-28T13:15:00Z"
}
```

Erros: 404 oportunidade inexistente; 409 sem vagas, encerrada ou com inscrição aberta da mesma pessoa; 400 se falta resposta obrigatória, documento exigido ou consentimento. Hoje só os metadados do arquivo trafegam; o envio do arquivo (multipart em `POST /paciente/inscricoes/{id}/documentos`) é a etapa 4.

### Profissional

| Rota | Estado | Corpo | Resposta |
| --- | --- | --- | --- |
| `GET /profissional-saude/inscricoes` 🔒 | nova | `?status=` opcional | array de `Inscricao` das oportunidades dele |
| `GET /profissional-saude/inscricoes/{id}` 🔒 | nova | | `Inscricao` com `mensagens` |
| `POST /profissional-saude/inscricoes/{id}/decisao` 🔒 | nova | `{status: "APROVADA" ou "RECUSADA", motivo, combinado}` | `Inscricao`; 400 recusa sem motivo; 409 se já decidida |
| `POST /profissional-saude/inscricoes/{id}/pedido-informacao` 🔒 | nova | `{texto}` | `Inscricao` em `AGUARDANDO_INFORMACOES`, prazo de 3 dias |
| `POST /profissional-saude/inscricoes/{id}/mensagens` 🔒 | nova | `{texto}` | 201 `Mensagem`; 409 se não está `APROVADA` |

Aprovar soma 1 em `vagasPreenchidas`. Decisão final não volta atrás.

### Objeto `Mensagem`

```json
{ "id": "msg-1", "autor": "PROFISSIONAL_SAUDE", "nomeAutor": "Dra. Juliana Prado", "texto": "Olá Ana, podemos marcar na terça às 10h?", "enviadaEm": "2026-11-11T15:45:00Z" }
```

---

## 8. Conta do paciente (LGPD)

| Rota | Estado | Corpo | Resposta |
| --- | --- | --- | --- |
| `POST /paciente/exportacao-dados` 🔒 | nova | | 202; cópia por e-mail em até 15 dias |
| `DELETE /paciente/documentos` 🔒 | nova | | 204; apaga os arquivos de todas as inscrições |
| `DELETE /paciente/conta` 🔒 | nova | `{senha}` | 204; 401 se a senha não confere; cancela as inscrições abertas |

---

## 9. Rotas de ADMIN (já existem, sem cliente)

`GET /user/profissionais/pendentes` e `PATCH /user/profissionais/{id}/aprovar`. Aprovar passa `situacaoRegistro` a `VERIFICADO`. Para a apresentação é preciso um ADMIN no banco (migração com um usuário de demonstração, por exemplo).

---

## 10. Servidor simulado dos clientes

Os dois clientes respondem este contrato em memória enquanto a API não tem a rota.

| Item | Valor |
| --- | --- |
| Paciente de teste | `paciente@teste.com`, qualquer senha não vazia, com as inscrições 20418, 20377, 20311 e 20102 |
| Profissional de teste | `profissional@teste.com`, qualquer senha não vazia |
| Código de verificação | `0000` |
| Bloqueio | 5 senhas erradas seguidas → 429 por 15 minutos |
| Token | `mock.<email>`; `expired` devolve 401 |

---

## 11. Ordem sugerida

| Etapa | Rotas |
| --- | --- |
| 1 | CORS; 401 e 403 separados; `message` em todo erro; `GET /oportunidades` público; `GET /user/me`; `expiraEmSegundos`; perfil fixo no cadastro de paciente; registro estruturado no cadastro de profissional |
| 2 | campos novos da oportunidade, três estados, busca com filtros e página, minhas oportunidades, encerrar, triagem e documentos exigidos; `GET /catalogos` |
| 3 | inscrições do paciente e do profissional, decisão, pedido de informação e resposta |
| 4 | mensagens, envio de arquivos, código por e-mail, recuperar senha, rotas de LGPD |
