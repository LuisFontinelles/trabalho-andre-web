# CareBridge · Contrato da API

Este documento descreve a API que o aplicativo iOS já consome. Enquanto o servidor não existe, o app intercepta as próprias requisições e responde com os JSONs que estão aqui. Isso significa que **o contrato já está exercitado de ponta a ponta**: montagem da requisição, código de status, decodificação e tratamento de erro.

Para o backend, a consequência prática é boa. Quando um endpoint real passar a responder no mesmo formato, basta apontar o app para ele e o fluxo funciona sem mudança no cliente. Os JSONs abaixo não são exemplo ilustrativo: são exatamente o que o app espera receber hoje.

Qualquer divergência de nome de campo, tipo ou formato quebra a decodificação no cliente. Se algum ponto precisar mudar, melhor avisar antes de implementar, que eu ajusto o app junto.

---

## 1. Convenções

| Item | Valor |
| --- | --- |
| Caminho base | `/v1` |
| Formato | JSON, UTF-8 |
| Autenticação | Token no cabeçalho, em todas as rotas exceto as de `/auth` |
| Cabeçalhos enviados | `Accept: application/json` sempre, `Content-Type: application/json` quando há corpo |
| Datas | ISO 8601 em UTC, como `2026-10-05T14:00:00Z` |
| Identificadores | String, não inteiro |

### Códigos de status acordados

| Código | Quando usar |
| --- | --- |
| 200 | Sucesso com corpo |
| 201 | Recurso criado |
| 204 | Sucesso sem corpo |
| 400 | Requisição malformada |
| 401 | Não autenticado ou credencial inválida |
| 404 | Recurso inexistente |
| 409 | Conflito, como e-mail já cadastrado |
| 422 | Requisição válida que fere regra de negócio |
| 500 | Erro inesperado |

### Corpo de erro

Todo erro responde com este mesmo formato, em qualquer rota. O app já trata assim.

```json
{
  "statusCode": 404,
  "message": "Not Found: user not found",
  "error": "Not Found",
  "requestId": "ddfd6adc-59d5-4ef0-a1f1-7bc904c9b17e"
}
```

| Campo | Tipo | Observação |
| --- | --- | --- |
| `statusCode` | int | Repete o status HTTP |
| `message` | string | Texto legível. O app pode mostrar ao usuário |
| `error` | string? | Nome do tipo de erro |
| `requestId` | string? | Para rastrear no log do servidor |

---

## 2. Autenticação

### POST /v1/auth/login

Requisição:

```json
{
  "email": "paciente@teste.com",
  "password": "Paciente@2026"
}
```

Resposta 200: o objeto de sessão da seção 2.5. Resposta 401 quando a credencial não confere.

O app normaliza o e-mail antes de enviar: remove espaços nas pontas e converte para minúsculas. O servidor pode assumir que chega normalizado, mas é mais seguro normalizar de novo.

### POST /v1/auth/google

Requisição: corpo vazio `{}` por enquanto. Quando o login social for implementado de verdade, o app vai enviar o token do provedor. Resposta 200 com o mesmo objeto de sessão.

### POST /v1/auth/signup

Requisição de paciente:

```json
{
  "username": "Joana Lima",
  "email": "joana.lima@teste.com",
  "password": "Paciente@2026",
  "profile": "PACIENTE",
  "acceptedTerms": true,
  "professional": null
}
```

Requisição de profissional de saúde:

```json
{
  "username": "Helena Souza",
  "email": "helena.souza@clinica.com",
  "password": "Profissa@2026",
  "profile": "PROFISSIONAL",
  "acceptedTerms": true,
  "professional": {
    "council": "CRM",
    "state": "DF",
    "number": "123456"
  }
}
```

**O cadastro não devolve sessão.** Ele devolve o desafio de verificação, e a sessão só nasce depois que o código é conferido. Resposta 201:

```json
{
  "email": "paciente@teste.com",
  "profile": "PACIENTE",
  "codeLength": 4
}
```

Respostas de erro esperadas: 409 se o e-mail já existe, 422 se `acceptedTerms` vier `false`.

O campo `profile` aceita `PACIENTE` ou `PROFISSIONAL`. O bloco `professional` só vem preenchido quando o perfil é profissional, e nesse caso os três campos são obrigatórios.

### POST /v1/auth/verify

Requisição:

```json
{
  "email": "joana.lima@teste.com",
  "code": "0000"
}
```

Resposta 200 com o objeto de sessão, 401 quando o código está incorreto ou expirou.

O app envia apenas dígitos: ele filtra o que não é número antes de mandar. O tamanho do código vem do `codeLength` devolvido no cadastro, hoje 4.

A sessão devolvida precisa refletir **quem se cadastrou**, não uma conta fixa: o `profile` e o `email` do usuário que acabou de verificar.

### POST /v1/auth/resend-code

Requisição `{ "email": "joana.lima@teste.com" }`. Resposta 204, sem corpo.

### POST /v1/auth/refresh

Requisição `{ "refreshToken": "..." }`.

| Situação | Resposta |
| --- | --- |
| Token válido | 200 com objeto de sessão |
| Token revogado ou inexistente | 204, sem corpo |
| Token ausente ou vazio | 400 com corpo de erro |

### GET /v1/auth/professional-catalog

Conselhos e UFs aceitos no cadastro profissional. O app monta os dois seletores a partir desta resposta, então acrescentar um conselho no servidor já aparece no app sem precisar de nova versão.

```json
{
  "councils": [
    {
      "id": "CRM",
      "label": "CRM"
    },
    {
      "id": "COREN",
      "label": "COREN"
    },
    {
      "id": "CRO",
      "label": "CRO"
    },
    {
      "id": "CRP",
      "label": "CRP"
    },
    {
      "id": "CREFITO",
      "label": "CREFITO"
    },
    {
      "id": "CREF",
      "label": "CREF"
    }
  ],
  "states": [
    {
      "id": "DF",
      "label": "DF"
    },
    {
      "id": "MG",
      "label": "MG"
    },
    {
      "id": "RJ",
      "label": "RJ"
    },
    {
      "id": "SP",
      "label": "SP"
    },
    {
      "id": "GO",
      "label": "GO"
    },
    {
      "id": "PR",
      "label": "PR"
    },
    {
      "id": "MT",
      "label": "MT"
    }
  ]
}
```

### 2.5 Objeto de sessão

Devolvido por login, google, verify e refresh.

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fixture.medhub",
  "expiresIn": 3600,
  "user": {
    "username": "Ana Paula Ribeiro",
    "email": "paciente@teste.com",
    "enabled": true,
    "profile": "PACIENTE",
    "address": {
      "street": "Rua das Flores",
      "neighborhood": "Centro",
      "zipCode": "01001-000",
      "number": "123",
      "complement": "Apartamento 201",
      "city": "São Paulo",
      "state": "SP"
    },
    "birthday": "15/05/1990",
    "income": 2500.0,
    "concern": [
      "Acompanhamento preventivo",
      "Orientação nutricional"
    ],
    "accessConditions": [
      "Disponibilidade no período da manhã"
    ],
    "healthHistory": "Dados fictícios para teste. Sem histórico de doenças crônicas.",
    "serviceRequests": [
      "Consulta clínica geral",
      "Avaliação nutricional"
    ]
  }
}
```

Exemplo com perfil profissional:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fixture.medhub.pro",
  "expiresIn": 3600,
  "user": {
    "username": "Marcos Vieira",
    "email": "profissional@teste.com",
    "enabled": true,
    "profile": "PROFISSIONAL",
    "address": {
      "street": "SGAS 915",
      "neighborhood": "Asa Sul",
      "zipCode": "70390-150",
      "number": "915",
      "complement": "Bloco C, sala 204",
      "city": "Brasília",
      "state": "DF"
    },
    "birthday": "02/11/1984",
    "income": null,
    "concern": null,
    "accessConditions": null,
    "healthHistory": null,
    "serviceRequests": null
  }
}
```

| Campo | Tipo | Observação |
| --- | --- | --- |
| `token` | string | Token de acesso |
| `expiresIn` | int | Segundos até expirar |
| `user.username` | string | Nome completo |
| `user.email` | string | |
| `user.enabled` | bool | |
| `user.profile` | string | `PACIENTE` ou `PROFISSIONAL` |
| `user.address` | objeto? | Pode ser nulo |
| `user.birthday` | string? | |
| `user.income` | number? | |
| `user.concern` | array? | |
| `user.accessConditions` | array? | |
| `user.healthHistory` | string? | |
| `user.serviceRequests` | array? | |

Os campos marcados com `?` podem vir nulos ou ausentes. O app trata os dois casos.

---

## 3. Oportunidades

### GET /v1/opportunities

Busca paginada. Parâmetros enviados na query:

| Parâmetro | Tipo | Observação |
| --- | --- | --- |
| `page` | int | Sempre enviado, começa em 1 |
| `q` | string | Termo livre, só quando preenchido |
| `specialty` | string | Ids separados por vírgula |
| `modality` | string | Ids separados por vírgula |
| `offerType` | string | Ids separados por vírgula |
| `distance` | string | Id da faixa, como `5` |

Exemplo: `/v1/opportunities?modality=online&page=2&specialty=cardiologia,psicologia`

A query vai sempre com as chaves em ordem alfabética e os valores de lista ordenados, o que facilita cache no servidor.

**Hoje a filtragem e a paginação acontecem no cliente**, sobre o conjunto completo que o mock devolve. Quando o backend existir, isso passa a ser responsabilidade do servidor e eu removo a lógica do app. A página tem 6 itens.

Resposta 200, com os dois primeiros itens como amostra:

```json
{
  "items": [
    {
      "id": "op-001",
      "title": "Psicologia online",
      "specialty": "psicologia",
      "modality": "online",
      "offerType": "gratuita",
      "vacancies": 3,
      "provider": {
        "id": "pr-001",
        "name": "Clínica Saúde",
        "kind": "INSTITUICAO",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "Remoto",
        "distanceKm": null
      },
      "summary": "Atendimento psicológico individual por videochamada, com agenda semanal.",
      "requiredDocuments": [
        "RG"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-002",
      "title": "Ortopedia",
      "specialty": "ortopedia",
      "modality": "presencial",
      "offerType": "social",
      "vacancies": 8,
      "provider": {
        "id": "pr-002",
        "name": "Boca Feliz",
        "kind": "CLINICA",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "QNM 34, Ceilândia",
        "distanceKm": 1.0
      },
      "summary": "Consulta ortopédica com avaliação de exames prévios.",
      "requiredDocuments": [
        "RG",
        "Encaminhamento médico"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    }
  ],
  "page": 1,
  "totalPages": 3,
  "totalItems": 14
}
```

### GET /v1/opportunities/{id}

Detalhe de uma oportunidade. Resposta 200 com um objeto no mesmo formato dos itens da lista:

```json
{
  "id": "op-004",
  "title": "Cardiologia – vaga social",
  "specialty": "cardiologia",
  "modality": "online",
  "offerType": "social",
  "vacancies": 5,
  "provider": {
    "id": "pr-004",
    "name": "Instituto movida",
    "kind": "INSTITUICAO",
    "verified": true
  },
  "location": {
    "city": "Brasília",
    "state": "DF",
    "address": "Rua das Flores, 120",
    "distanceKm": 4.8
  },
  "summary": "Avaliação cardiológica com ECG, voltada a pacientes sem convênio. Requer triagem prévia.",
  "requiredDocuments": [
    "RG"
  ],
  "updatedAt": "2026-10-05T14:00:00Z"
}
```

### GET /v1/filters

Catálogo que alimenta a tela de filtros. Os `id` daqui são os mesmos valores aceitos nos parâmetros de busca.

```json
{
  "specialties": [
    {
      "id": "cardiologia",
      "label": "Cardiologia"
    },
    {
      "id": "ortopedia",
      "label": "Ortopedia"
    },
    {
      "id": "psicologia",
      "label": "Psicologia"
    },
    {
      "id": "clinica-geral",
      "label": "Clínica geral"
    },
    {
      "id": "fisioterapia",
      "label": "Fisioterapia"
    },
    {
      "id": "odontologia",
      "label": "Odontologia"
    },
    {
      "id": "terapia-ocupacional",
      "label": "Terapia ocupacional"
    }
  ],
  "modalities": [
    {
      "id": "presencial",
      "label": "Presencial"
    },
    {
      "id": "online",
      "label": "Online"
    }
  ],
  "distances": [
    {
      "id": "2",
      "label": "Até 2km"
    },
    {
      "id": "5",
      "label": "Até 5km"
    },
    {
      "id": "10",
      "label": "Até 10km"
    }
  ],
  "offerTypes": [
    {
      "id": "gratuita",
      "label": "Gratuita"
    },
    {
      "id": "social",
      "label": "Social"
    },
    {
      "id": "convenio",
      "label": "Convênio"
    }
  ]
}
```

### Campos de uma oportunidade

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | string | |
| `title` | string | |
| `specialty` | string | Id do catálogo de especialidades |
| `modality` | string | `presencial` ou `online` |
| `offerType` | string | `gratuita`, `social` ou `convenio` |
| `vacancies` | int | Zero significa sem vagas |
| `provider.id` | string | |
| `provider.name` | string | |
| `provider.kind` | string | `INSTITUICAO` ou `PROFISSIONAL` |
| `provider.verified` | bool | Mostra o selo de verificado no app |
| `location.city` | string | |
| `location.state` | string | |
| `location.address` | string? | |
| `location.distanceKm` | number? | Nulo quando a oferta é online |
| `summary` | string? | |
| `requiredDocuments` | array? | Nomes dos documentos exigidos |
| `updatedAt` | string | ISO 8601 |

Valores desconhecidos em `modality` e `offerType` não quebram o app: ele cai em um padrão seguro. Mesmo assim, melhor combinar antes de introduzir valor novo.

---

## 4. Candidaturas

### POST /v1/applications

Requisição:

```json
{
  "opportunityId": "op-004",
  "triage": {
    "reason": "Ansiedade e insônia há três meses",
    "hasDiagnosis": false,
    "usesContinuousMedication": true,
    "urgency": "medium"
  },
  "documentNames": ["RG_frente.jpg"]
}
```

O campo `urgency` aceita `low`, `medium` ou `high`.

Hoje o app envia apenas os **nomes** dos arquivos, porque a seleção real de arquivo ainda não está implementada. Quando o upload existir, provavelmente vira multipart ou um fluxo de duas etapas com URL assinada. Isso precisa ser combinado.

Resposta 201:

```json
{
  "id": "app-20418",
  "protocolNumber": "20418",
  "opportunityId": "op-004",
  "status": "EM_ANALISE",
  "timeline": [
    {
      "title": "Recebida",
      "detail": "Hoje, 14:32",
      "done": true
    },
    {
      "title": "Triagem concluída",
      "detail": "Hoje, 14:32",
      "done": true
    },
    {
      "title": "Em análise",
      "detail": "Prazo estimado: 48 h",
      "done": false
    },
    {
      "title": "Resposta do profissional",
      "detail": "Você será notificado",
      "done": false
    }
  ]
}
```

### GET /v1/applications/{id}

Status e linha do tempo da candidatura. Resposta 200, mesmo formato:

```json
{
  "id": "app-20418",
  "protocolNumber": "20418",
  "opportunityId": "op-004",
  "status": "EM_ANALISE",
  "timeline": [
    {
      "title": "Recebida",
      "detail": "Hoje, 14:32",
      "done": true
    },
    {
      "title": "Triagem concluída",
      "detail": "Hoje, 14:32",
      "done": true
    },
    {
      "title": "Em análise",
      "detail": "Prazo estimado: 48 h",
      "done": false
    },
    {
      "title": "Resposta do profissional",
      "detail": "Você será notificado",
      "done": false
    }
  ]
}
```

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | string | |
| `protocolNumber` | string | Mostrado ao usuário como protocolo |
| `opportunityId` | string | |
| `status` | string | O app ainda não usa, mas decodifica |
| `timeline[].title` | string | |
| `timeline[].detail` | string | Texto livre, mostrado abaixo do título |
| `timeline[].done` | bool | Passos concluídos aparecem preenchidos |

A linha do tempo é montada pelo servidor e renderizada como vem. O app não decide quais passos existem.

---

## 5. Regras do mock, para comparação

Estas regras existem só no simulador do app. Servem para você saber o que o cliente espera ver em cada situação.

### Contas de teste

| E-mail | Perfil | Senha |
| --- | --- | --- |
| `paciente@teste.com` | PACIENTE | qualquer senha não vazia |
| `profissional@teste.com` | PROFISSIONAL | qualquer senha não vazia |

Qualquer outro e-mail responde 401, de propósito, para exercitar a tela de erro.

### Código de verificação

`0000` é aceito. Qualquer outro responde 401.

### Cadastro de e-mail novo

O mock guarda o cadastro em memória e a verificação devolve o perfil e o nome que foram cadastrados, não uma conta fixa.

### Rotas de teste de erro

Existem no app para exercitar o tratamento de falha. **Não precisa implementar no servidor.**

| Rota | Status |
| --- | --- |
| `GET /v1/debug/no-content` | 204 |
| `GET /v1/debug/bad-request` | 400 |
| `GET /v1/debug/unauthorized` | 401 |
| `GET /v1/debug/not-found` | 404 |
| `GET /v1/debug/server-error` | 500 |

---

## 6. Sugestão de ordem de implementação

Como o app funciona sobre o mock, dá para integrar endpoint por endpoint, sem big bang.

1. `GET /v1/filters` e `GET /v1/opportunities`. São as duas rotas que não dependem de autenticação e já dão para ver a tela de busca com dados reais.
2. `GET /v1/opportunities/{id}`.
3. `POST /v1/auth/login`, para trocar o login simulado pelo real.
4. `POST /v1/auth/signup`, `POST /v1/auth/verify` e `POST /v1/auth/resend-code`, junto com o envio de e-mail.
5. `GET /v1/auth/professional-catalog`.
6. `POST /v1/applications` e `GET /v1/applications/{id}`.
7. `POST /v1/auth/refresh`.

A cada endpoint pronto, me avisa que eu aponto aquela chamada do app para o servidor e testo.

---

## 7. Anexo: catálogo completo de oportunidades

Os 14 itens que o mock devolve hoje. Servem de carga inicial para o banco.

```json
{
  "items": [
    {
      "id": "op-001",
      "title": "Psicologia online",
      "specialty": "psicologia",
      "modality": "online",
      "offerType": "gratuita",
      "vacancies": 3,
      "provider": {
        "id": "pr-001",
        "name": "Clínica Saúde",
        "kind": "INSTITUICAO",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "Remoto",
        "distanceKm": null
      },
      "summary": "Atendimento psicológico individual por videochamada, com agenda semanal.",
      "requiredDocuments": [
        "RG"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-002",
      "title": "Ortopedia",
      "specialty": "ortopedia",
      "modality": "presencial",
      "offerType": "social",
      "vacancies": 8,
      "provider": {
        "id": "pr-002",
        "name": "Boca Feliz",
        "kind": "CLINICA",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "QNM 34, Ceilândia",
        "distanceKm": 1.0
      },
      "summary": "Consulta ortopédica com avaliação de exames prévios.",
      "requiredDocuments": [
        "RG",
        "Encaminhamento médico"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-003",
      "title": "Avaliação odontológica",
      "specialty": "odontologia",
      "modality": "presencial",
      "offerType": "gratuita",
      "vacancies": 8,
      "provider": {
        "id": "pr-003",
        "name": "Espaço Cuidar",
        "kind": "CLINICA",
        "verified": false
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "SCS Quadra 2",
        "distanceKm": 2.1
      },
      "summary": "Avaliação inicial e plano de tratamento em clínica-escola.",
      "requiredDocuments": [
        "RG",
        "Comprovante de residência"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-004",
      "title": "Cardiologia – vaga social",
      "specialty": "cardiologia",
      "modality": "online",
      "offerType": "social",
      "vacancies": 5,
      "provider": {
        "id": "pr-004",
        "name": "Instituto movida",
        "kind": "INSTITUICAO",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "Rua das Flores, 120",
        "distanceKm": 4.8
      },
      "summary": "Avaliação cardiológica com ECG, voltada a pacientes sem convênio. Requer triagem prévia.",
      "requiredDocuments": [
        "RG"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-005",
      "title": "Psicologia Infantil",
      "specialty": "psicologia",
      "modality": "presencial",
      "offerType": "social",
      "vacancies": 5,
      "provider": {
        "id": "pr-005",
        "name": "Faculdade Ensine",
        "kind": "UNIVERSIDADE",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "Campus Taguatinga",
        "distanceKm": 12.3
      },
      "summary": "Acompanhamento psicológico infantil supervisionado por docentes.",
      "requiredDocuments": [
        "RG",
        "Certidão de nascimento"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-006",
      "title": "Fisioterapia respiratória",
      "specialty": "fisioterapia",
      "modality": "presencial",
      "offerType": "gratuita",
      "vacancies": 4,
      "provider": {
        "id": "pr-006",
        "name": "Clínica-escola UCB",
        "kind": "UNIVERSIDADE",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "QS 07 Taguatinga",
        "distanceKm": 8.2
      },
      "summary": "Sessões de fisioterapia respiratória com encaminhamento médico recente.",
      "requiredDocuments": [
        "RG",
        "Encaminhamento médico"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-007",
      "title": "Clínica geral – mutirão",
      "specialty": "clinica-geral",
      "modality": "presencial",
      "offerType": "gratuita",
      "vacancies": 12,
      "provider": {
        "id": "pr-007",
        "name": "Secretaria de Saúde",
        "kind": "PODER_PUBLICO",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "UBS 2 Ceilândia",
        "distanceKm": 6.4
      },
      "summary": "Mutirão de atendimento clínico com agendamento na própria UBS.",
      "requiredDocuments": [
        "Cartão SUS",
        "RG"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-008",
      "title": "Terapia ocupacional",
      "specialty": "terapia-ocupacional",
      "modality": "presencial",
      "offerType": "convenio",
      "vacancies": 2,
      "provider": {
        "id": "pr-008",
        "name": "Centro Integrado",
        "kind": "CLINICA",
        "verified": false
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "Asa Sul",
        "distanceKm": 9.7
      },
      "summary": "Atendimento em terapia ocupacional para adultos.",
      "requiredDocuments": [
        "RG"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-009",
      "title": "Odontologia preventiva",
      "specialty": "odontologia",
      "modality": "presencial",
      "offerType": "social",
      "vacancies": 6,
      "provider": {
        "id": "pr-009",
        "name": "Espaço Cuidar",
        "kind": "CLINICA",
        "verified": false
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "SCS Quadra 2",
        "distanceKm": 2.1
      },
      "summary": "Profilaxia e orientação de higiene bucal.",
      "requiredDocuments": [
        "RG"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-010",
      "title": "Psicologia adulto",
      "specialty": "psicologia",
      "modality": "online",
      "offerType": "convenio",
      "vacancies": 1,
      "provider": {
        "id": "pr-010",
        "name": "Clínica Saúde",
        "kind": "INSTITUICAO",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "Remoto",
        "distanceKm": null
      },
      "summary": "Psicoterapia para adultos em modalidade remota.",
      "requiredDocuments": [
        "RG"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-011",
      "title": "Cardiologia preventiva",
      "specialty": "cardiologia",
      "modality": "presencial",
      "offerType": "gratuita",
      "vacancies": 7,
      "provider": {
        "id": "pr-011",
        "name": "Instituto movida",
        "kind": "INSTITUICAO",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "Rua das Flores, 120",
        "distanceKm": 4.8
      },
      "summary": "Triagem cardiológica preventiva com aferição e orientação.",
      "requiredDocuments": [
        "RG"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-012",
      "title": "Ortopedia infantil",
      "specialty": "ortopedia",
      "modality": "presencial",
      "offerType": "social",
      "vacancies": 3,
      "provider": {
        "id": "pr-012",
        "name": "Boca Feliz",
        "kind": "CLINICA",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "QNM 34, Ceilândia",
        "distanceKm": 1.0
      },
      "summary": "Avaliação ortopédica pediátrica.",
      "requiredDocuments": [
        "RG",
        "Certidão de nascimento"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-013",
      "title": "Nutrição clínica",
      "specialty": "clinica-geral",
      "modality": "online",
      "offerType": "gratuita",
      "vacancies": 9,
      "provider": {
        "id": "pr-013",
        "name": "Faculdade Ensine",
        "kind": "UNIVERSIDADE",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "Remoto",
        "distanceKm": null
      },
      "summary": "Acompanhamento nutricional com estudantes supervisionados.",
      "requiredDocuments": [
        "RG"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    },
    {
      "id": "op-014",
      "title": "Fisioterapia ortopédica",
      "specialty": "fisioterapia",
      "modality": "presencial",
      "offerType": "social",
      "vacancies": 4,
      "provider": {
        "id": "pr-014",
        "name": "Clínica-escola UCB",
        "kind": "UNIVERSIDADE",
        "verified": true
      },
      "location": {
        "city": "Brasília",
        "state": "DF",
        "address": "QS 07 Taguatinga",
        "distanceKm": 8.2
      },
      "summary": "Reabilitação ortopédica pós-lesão.",
      "requiredDocuments": [
        "Encaminhamento médico"
      ],
      "updatedAt": "2026-10-05T14:00:00Z"
    }
  ],
  "page": 1,
  "totalPages": 3,
  "totalItems": 14
}
```
