# RCF - Carta Renda Admissional

## 1. Objetivo e Escopo

Documento admissional editavel e imprimivel da categoria `oficios`, destinado ao Banco do Brasil S.A., para declarar que a pessoa qualificada pertence ao quadro de funcionarios ou contratados da empresa declarante.

Inclui dados pessoais, profissionais, residenciais e empresariais; impressao/PDF A4 retrato; validacoes exigidas; compartilhamento de URL pre-preenchida; timbre opcional. Regras globais de autosave, toolbar, Base64, impressao, PDF e estilos documentais comuns sao consumidas da infraestrutura compartilhada.

## 2. Conteudo Normativo

O texto declara o vinculo da pessoa com a empresa, a validacao dos dados pela declarante e a responsabilidade de comunicar alteracao ou remocao do quadro.

O documento deve informar que precisa ser acompanhado da Cedula de Identidade original.

Localidade e fixa em `Pirassununga-SP`; qualquer alteracao e regra especifica futura deste RCF. A data e gerada automaticamente no formato:

```text
DD de Mes de AAAA
```

## 3. Campos

Pessoa qualificada:

- Nome;
- CPF;
- E-mail;
- Celular com DDD;
- Telefone de recado com DDD;
- Logradouro/endereco;
- Bairro;
- Municipio;
- UF;
- CEP;
- Cargo ou funcao;
- Salario.

Empresa declarante:

- Nome da empresa;
- CNPJ da empresa;
- Telefone fixo da empresa com DDD;
- Carimbo, nome do representante ou assinatura correspondente.

Campos da empresa usam atributo `empresa` e podem ser validados isoladamente para compartilhamento e impressao de formulario em branco.

O documento deve preservar areas para reconhecimento de firma BB ou validacao, com data, horario e responsavel; carimbo/assinatura de funcionario BB ou assinatura digital, com indicacao para rodape ou anexo; assinatura fisica da pessoa ou assinatura digital via `gov.br`.

## 4. Validacoes e Normalizacao

Validacoes devem ser declaradas localmente por campo, consumindo o catalogo global. Cada campo escolhe explicitamente obrigatoriedade, opcionalidade, `pattern`, CPF, CNPJ, CEP, telefone, celular, moeda ou transformacao para maiusculas.

Regras obrigatorias:

- Nome da pessoa obrigatorio com padrao definido no HTML;
- CPF obrigatorio e valido;
- E-mail opcional, valido quando preenchido;
- Celular obrigatorio com DDD valido e nono digito;
- Telefone de recado opcional, valido quando preenchido;
- Logradouro, bairro, municipio, UF, cargo/funcao e salario obrigatorios;
- UF restrita as unidades federativas brasileiras aceitas no HTML;
- CEP obrigatorio e valido;
- Salario obrigatorio e formatado em BRL;
- Nome da empresa obrigatorio e convertido para maiusculas;
- CNPJ da empresa obrigatorio e valido;
- Telefone fixo da empresa obrigatorio e valido.

Por compatibilidade, CNPJ deve aceitar 3 a 14 digitos, completar zeros a esquerda ate 14 digitos e validar digitos verificadores.

## 5. Impressao

O documento usa A4 retrato:

```text
Tamanho: 21 cm x 29,7 cm
Margem esquerda: 1,4 cm
Margem direita: 0,5 cm
Margem superior: 1 cm
Margem inferior: 1,5 cm
Unidade: cm
Orientacao: retrato
```

A versao lateral deve aparecer na impressao e no PDF.

## 6. Acoes e Timbre

Acoes disponiveis:

- Imprimir PDF preenchido;
- Imprimir PDF em branco, preservando dados da empresa e limpando campos automaticos;
- Limpar campos automaticos;
- Carregar timbre;
- Compartilhar URL pre-preenchida;
- Exibir indicador de autosave.

Timbre e opcional, aceita `.svg`, `.jpg`, `.jpeg` e `.png`, aparece no topo e integra impressao/PDF quando carregado.

## 7. Compartilhamento e JSON Base64

A acao de compartilhamento deve usar a infraestrutura global de `share`. Link limpo nao exige validacao especifica. Link preenchido deve validar campos da empresa e copiar URL publica com JSON Base64 contendo telefone, CNPJ, nome da empresa, timbre quando houver e campos pessoais, profissionais, residenciais e empresariais preenchidos. Base64 e apenas ofuscacao.

Aliases legados de leitura:

- `empresa` ou `nome` para nome da empresa;
- `cnpj` para CNPJ;
- `tel`, `fone` ou `telefone` para telefone;
- `timbre` ou `logo` para timbre.

Payload JSON Base64 integral deve aceitar, alem dos aliases legados:

- `pessoaNome`, `funcionarioNome` ou `nomePessoa`;
- `cpf`, `pessoaCpf` ou `funcionarioCpf`;
- `email` ou `pessoaEmail`;
- `celular` ou `pessoaCelular`;
- `recado` ou `telefoneRecado`;
- `logradouro` ou `endereco`;
- `bairro`;
- `municipio` ou `cidade`;
- `uf` ou `estado`;
- `cep`;
- `cargo`, `funcao` ou `cargoFuncao`;
- `salario` ou `renda`;
- `empresa`, `nomeEmpresa` ou `razaoSocial`;
- `cnpj`;
- `tel`, `fone` ou `telefone`.

A exportacao local pela toolbar global deve usar envelope do modulo `admissional`, schema `jcem.admissional.v1` e versao vigente do documento. A importacao local deve validar extensao, modulo, schema e versao antes de aplicar dados aos campos mapeados, incluindo timbre quando fornecido como Data URL. Arquivos de outros modulos devem ser recusados sem alterar o documento.

## 8. Compatibilidade e Responsabilidades

Identificadores e comportamentos que sustentam dados ja salvos em `localStorage` devem ser preservados. Campos sem `id` continuam recebendo identificador automatico pela infraestrutura compartilhada.

Conteudo textual, mapeamentos, mensagens especificas, margens particulares, layout interno de assinatura e selecao de validadores pertencem ao modulo admissional. Layout global de workspace/preview, validacao comum, autosave, impressao, timbre, data, toolbar, Base64 e estilos documentais comuns pertencem a camada compartilhada.

Aparencia da toolbar, icones Font Awesome, tooltips, separadores, contraste de interface, workspace, preview e posicionamento da folha nao pertencem ao modulo admissional. O CSS local deve conter apenas ajustes particulares do conteudo interno da folha.

## 9. Arquitetura Local

```text
src/oficios/admissional/
├── RCF.md
├── admissional.css
├── admissional.ts
└── index.html
```

O documento deve consumir `/assets/css/documentos.css` e `/assets/js/documentos.js`. `admissional.ts` contem somente configuracao e comportamentos especificos. `admissional.css` contem somente estilos particulares que nao pertencem ao padrao comum.

Codigo local canonico: `src/oficios/admissional/admissional.ts`. Artefatos gerados em `dist/oficios/admissional/` nao sao fonte canonica.

## 10. Decisoes Locais

- Documento estatico, executado no navegador.
- Infraestrutura reutilizavel extraida para `src/assets/`.
- Modulo local mantem apenas configuracao, mapeamentos e layout interno especifico de assinatura.
- Comportamento local e TypeScript compilado para JavaScript publicado.
- Validacoes comuns sao selecionadas por campo no modulo.
- Compartilhamento legado por parametros individuais permanece por compatibilidade.
- Preenchimento integral por JSON Base64 e configurado localmente por chaves especificas.
