# RCF - Carta Renda Admissional

## Projeto

Ofício de Carta de Renda Admissional.

## Objetivo

Gerar documento admissional editável e imprimível para declarar ao Banco do Brasil S.A. que a pessoa qualificada pertence ao quadro de funcionários ou contratados da empresa declarante.

## Escopo

- Documento formal dentro da categoria `oficios`.
- Preenchimento de dados pessoais, profissionais, residenciais e empresariais.
- Impressão e exportação em PDF no formato A4 retrato.
- Validação dos campos exigidos pelo documento.
- Compartilhamento de URL pré-preenchida com dados da empresa.
- Timbre opcional da empresa declarante.

## Regras de Negócio Específicas

### RN001 - Destinatário

O documento é dirigido ao Banco do Brasil S.A.

Essa regra é textual e específica do modelo admissional.

### RN002 - Declaração

O texto declara que a pessoa qualificada pertence ao quadro de funcionários ou contratados da empresa declarante.

A empresa declara validar e confirmar os dados apresentados, responsabilizando-se por comunicar alteração ou remoção do quadro.

### RN003 - Documento de Identidade

O documento admissional deve informar que precisa ser acompanhado da Cédula de Identidade original.

### RN004 - Local e Data

O documento apresenta local fixo `Pirassununga-SP` e data gerada automaticamente no formato:

```text
DD de Mês de AAAA
```

Alteração de localidade é regra específica deste documento e deve ser registrada neste RCF.

### RN005 - Campos da Pessoa Qualificada

O formulário deve coletar:

- Nome.
- CPF.
- E-mail.
- Celular com DDD.
- Telefone de recado com DDD.
- Logradouro/endereço.
- Bairro.
- Município.
- UF.
- CEP.
- Cargo ou função.
- Salário.

### RN006 - Campos da Empresa

O bloco de assinatura da empresa deve coletar:

- Nome da empresa.
- CNPJ da empresa.
- Telefone fixo da empresa com DDD.
- Carimbo, nome do representante ou assinatura correspondente.

Os campos da empresa são marcados com atributo `empresa` e podem ser validados isoladamente para compartilhamento e impressão de formulário em branco.

### RN007 - Campos do Banco

O documento deve preservar área para reconhecimento de firma BB ou validação do documento, incluindo data, horário e identificação do responsável.

Também deve preservar área para carimbo e assinatura de funcionário BB ou assinatura digital, com indicação para rodapé ou anexo.

### RN008 - Assinatura da Pessoa

O documento deve preservar área para assinatura física ou assinatura digital via `gov.br`.

### RN009 - Validações Específicas

As validações do documento admissional devem ser declaradas no módulo local por regra de campo, consumindo o catálogo global de validadores comuns.

As regras de campo devem aplicar:

- Nome da pessoa obrigatório com padrão definido no HTML.
- CPF obrigatório e válido.
- E-mail opcional, mas válido quando preenchido.
- Celular obrigatório com DDD válido e nono dígito.
- Telefone de recado opcional, mas válido quando preenchido.
- Logradouro obrigatório.
- Bairro obrigatório.
- Município obrigatório.
- UF obrigatória e restrita às unidades federativas brasileiras aceitas no HTML.
- CEP obrigatório e válido.
- Cargo/função obrigatório.
- Salário obrigatório e formatado em BRL.
- Nome da empresa obrigatório, convertido para maiúsculas.
- CNPJ da empresa obrigatório e válido.
- Telefone fixo da empresa obrigatório e válido.

Cada campo pode escolher explicitamente se é obrigatório, opcional, validado por `pattern`, validado por CPF/CNPJ/CEP/telefone/celular/moeda ou transformado para maiúsculas.

### RN010 - CNPJ com Zeros à Esquerda

O CNPJ deve aceitar valor com 3 a 14 dígitos, completar com zeros à esquerda até 14 dígitos e validar os dígitos verificadores.

Essa regra é mantida por compatibilidade com o comportamento anterior do documento.

### RN011 - Impressão Particular

O documento admissional usa A4 retrato com a seguinte configuração:

```text
Tamanho: 21 cm x 29,7 cm
Margem esquerda: 1,4 cm
Margem direita: 0,5 cm
Margem superior: 1 cm
Margem inferior: 1,5 cm
Unidade: cm
Orientação: retrato
```

A versão lateral deve aparecer na impressão e no PDF.

### RN012 - Ações Disponíveis

O documento admissional deve oferecer:

- Imprimir PDF preenchido.
- Imprimir PDF em branco, preservando dados da empresa e limpando campos automáticos.
- Limpar campos automáticos.
- Carregar timbre.
- Compartilhar URL pré-preenchida.
- Exibir indicador de salvamento automático.

### RN013 - Timbre

O timbre é opcional e deve aceitar `.svg`, `.jpg`, `.jpeg` e `.png`.

Quando carregado, deve aparecer no topo do documento e ser incluído na impressão/PDF.

### RN014 - Compartilhamento

A ação de compartilhamento deve consumir a infraestrutura global de `share`.

Quando o usuário escolher compartilhar apenas o link limpo, nenhuma validação específica do admissional deve ser exigida.

Quando o usuário escolher compartilhar o modelo preenchido, a ação deve validar os campos da empresa e copiar URL pública com JSON Base64 contendo:

- Telefone da empresa.
- CNPJ da empresa.
- Nome da empresa.
- Timbre, quando houver.
- Campos pessoais, profissionais, residenciais e empresariais preenchidos no formulário.

Os dados devem ser codificados em Base64 apenas como ofuscação.

Aliases legados aceitos para leitura e compatibilidade retroativa:

- `empresa` ou `nome` para nome da empresa.
- `cnpj` para CNPJ da empresa.
- `tel`, `fone` ou `telefone` para telefone da empresa.
- `timbre` ou `logo` para timbre.

### RN015 - JSON Base64

Além dos aliases legados, o documento deve aceitar payload JSON Base64 para preenchimento integral.

As chaves documentadas para o admissional incluem:

- `pessoaNome`, `funcionarioNome` ou `nomePessoa`.
- `cpf`, `pessoaCpf` ou `funcionarioCpf`.
- `email` ou `pessoaEmail`.
- `celular` ou `pessoaCelular`.
- `recado` ou `telefoneRecado`.
- `logradouro` ou `endereco`.
- `bairro`.
- `municipio` ou `cidade`.
- `uf` ou `estado`.
- `cep`.
- `cargo`, `funcao` ou `cargoFuncao`.
- `salario` ou `renda`.
- `empresa`, `nomeEmpresa` ou `razaoSocial`.
- `cnpj`.
- `tel`, `fone` ou `telefone`.

### RN016 - Compatibilidade Retroativa

O documento deve preservar os identificadores e comportamentos que sustentam dados já salvos em `localStorage`.

Campos sem `id` continuam recebendo identificador automático pela infraestrutura compartilhada.

### RN017 - Conteúdo Local Exclusivo

Conteúdo textual, mapeamentos de campo, mensagens específicas, margens particulares e layout da assinatura pertencem ao módulo admissional.

Validação, autosave, impressão, timbre, data, toolbar, Base64 e estilos documentais comuns pertencem à camada compartilhada.

A seleção de quais validadores globais se aplicam a cada campo pertence ao módulo admissional.

## Arquitetura Local

### ARQ001 - Arquivos

```text
oficios/admissional/
├── RCF.md
├── admissional.css
├── admissional.js
└── index.html
```

### ARQ002 - Consumo da Camada Compartilhada

O documento deve consumir:

- `../../assets/css/documentos.css`.
- `../../assets/js/documentos.js`.

O arquivo `admissional.js` deve conter somente configuração e comportamentos específicos do documento.

O código-fonte canônico do comportamento local é `src/oficios/admissional/admissional.ts`; `oficios/admissional/admissional.js` é artefato compilado para compatibilidade com publicação estática.

O arquivo `admissional.css` deve conter somente estilos particulares que não pertencem ao padrão comum de documentos.

### ARQ003 - Decisões Arquiteturais Locais

Decisões registradas:

- O documento permanece estático e executado integralmente no navegador.
- A infraestrutura reutilizável foi extraída para `assets/`.
- O módulo local mantém apenas configuração, mapeamentos e layout específico de assinatura.
- O comportamento local do documento é escrito em TypeScript e publicado como JavaScript compilado.
- As validações comuns são consumidas do catálogo global e selecionadas por campo no módulo local.
- O compartilhamento legado por parâmetros individuais permanece por compatibilidade.
- O preenchimento integral por JSON Base64 é configurado no módulo local por chaves específicas do documento.
