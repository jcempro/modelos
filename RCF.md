# RCF - Requirements & Control Framework

## Projeto

Modelos Web JCEM.

## Objetivo

Disponibilizar modelos e utilitários Web estáticos, com infraestrutura compartilhada para documentos editáveis, parametrizáveis e imprimíveis com fidelidade em A4.

## Escopo

- Páginas estáticas executadas no navegador.
- Documentos imprimíveis organizados por categoria e módulo.
- Utilitários Web simples que não dependem de backend.
- Bookmarklets utilitários em `favoritos/`.
- Componentes reutilizáveis em `assets/`.
- Fontes TypeScript em `src/`, compiladas para artefatos estáticos publicados.
- Persistência local no navegador por `localStorage`.
- Geração de PDF no cliente quando houver botão dedicado.
- Preenchimento parametrizado por query string.
- Publicação estática sob o domínio `modelos.jcem.pro`.

## Regras de Negócio Globais

### RN001 - Separação de Escopos Normativos

O `RCF.md` global deve conter apenas regras transversais ao sistema.

Cada documento ou módulo especializado deve possuir seu próprio `RCF.md` quando tiver objetivo, campos, validações, layout ou decisões que não façam sentido para todo o projeto.

Regras específicas não devem ser promovidas ao RCF global apenas por terem surgido durante a implementação de um documento.

### RN002 - Documento como Artefato de Impressão

Documentos imprimíveis têm como finalidade gerar artefatos previsíveis para papel ou PDF.

Toda estilização de documentos imprimíveis deve priorizar fidelidade de impressão, sem impedir uma experiência Web utilizável para edição, avisos e ações auxiliares.

### RN003 - Separação entre Interface Web e Área Imprimível

Documentos devem separar conceitualmente:

- Interface Web: avisos, barras de ferramentas, controles, mensagens, botões, inputs auxiliares e feedbacks de edição.
- Área imprimível: conteúdo formal que deve aparecer no papel ou PDF.

Elementos não imprimíveis devem ser visíveis apenas na interface Web e ocultados em `@media print` e em qualquer modo programático de geração de PDF.

### RN004 - Fidelidade A4

A área imprimível deve possuir layout preciso e previsível em A4 quando o documento declarar esse formato.

Margens, dimensões, largura útil, posicionamento, tabelas, campos, timbres, rodapés de versão e paginação devem ser controlados por CSS e configuração explícita, evitando dependência de comportamento implícito do navegador.

### RN005 - Impressão pelo Navegador e por PDF Dedicado

A impressão deve funcionar corretamente tanto via Ctrl+P, ou equivalente do sistema/navegador, quanto por botão dedicado de geração de PDF quando o documento oferecer essa ação.

O botão dedicado deve preparar o documento para impressão, ocultar placeholders e elementos de interface, aplicar configuração de página e restaurar o estado visual depois da geração.

### RN006 - Responsividade Restrita

A visualização Web pode ser responsiva para melhorar uso em telas diferentes.

A responsividade deve ficar restrita a elementos de interface, barras, avisos e controles. Ela não deve alterar medidas fundamentais, proporções, margens, paginação ou alinhamentos da área imprimível.

### RN007 - Componentes Reutilizáveis

Tudo que possuir potencial de reutilização entre documentos deve ficar em camada compartilhada do projeto.

Devem ser centralizados, quando aplicável:

- Barra de ferramentas.
- Sistema de impressão e exportação PDF.
- Estilos documentais comuns.
- Componentes de formulário.
- Salvamento automático.
- Preenchimento por parâmetros.
- Utilitários de validação e formatação.
- Timbre ou upload de imagem documental.
- Funções de data.
- Acesso à área de transferência.
- Compartilhamento de link limpo ou preenchido por JSON Base64.

### RN008 - Barra de Ferramentas Extensível

A barra de ferramentas deve ser desacoplada do documento e tratada como componente reutilizável, configurável e extensível.

A barra poderá conter ações:

- Globais, disponíveis em todo o projeto.
- Específicas do tipo documental.
- Específicas da categoria.
- Específicas do documento individual.

A configuração deve permitir habilitar, ocultar, ordenar e parametrizar ações sem duplicar lógica em cada documento.

### RN009 - Salvamento Automático

Documentos editáveis devem possuir salvamento automático durante a edição quando houver campos de usuário.

A persistência padrão deve ser local ao navegador, usando `localStorage`, sem exigir botão manual de salvar.

Campos sem identificador explícito podem receber identificador automático, desde que esse comportamento preserve compatibilidade com documentos existentes.

### RN010 - Validação e Normalização Reutilizáveis

Validações com uso potencialmente comum devem ficar na camada compartilhada.

O sistema compartilhado deve disponibilizar um catálogo global de validadores e normalizadores, no mínimo para:

- CPF.
- CNPJ.
- CEP.
- Telefone fixo brasileiro.
- Celular brasileiro.
- Moeda em BRL.
- Padrões HTML definidos por `pattern`.
- Campos obrigatórios.

O uso desses validadores deve ser opt-in por documento e por campo. Cada documento deve poder declarar, para cada campo, se a validação é exigida, opcional, desativada ou substituída por validador próprio.

A configuração por campo deve permitir definir seletor, obrigatoriedade, tipo de validador, normalização, mensagem, `pattern` e transformações simples como maiúsculas.

Mensagens específicas de domínio devem permanecer configuráveis por documento.

### RN011 - Preenchimento por Query String

Qualquer documento deverá poder ser totalmente preenchido por parâmetros recebidos via JSON na query string, codificados em Base64.

Base64 deve ser tratado como mecanismo de ofuscação e transporte, nunca como segurança, autenticação, assinatura ou criptografia.

A camada compartilhada deve oferecer leitura de payload JSON Base64 e aplicação por mapeamento configurado pelo documento.

Aliases legados por parâmetros individuais podem ser preservados no módulo específico do documento.

### RN012 - Compartilhamento de Página ou Modelo Preenchido

Documentos podem disponibilizar ação de compartilhamento na barra de ferramentas.

A ação compartilhada de `share` deve pertencer à camada global e perguntar ao usuário se deseja:

- Compartilhar apenas o link limpo da página, sem query string e sem dados preenchidos.
- Compartilhar o link da página com dados preenchidos em JSON codificado em Base64 no parâmetro `data`, ou nome equivalente configurado.

URLs compartilhadas com dados em Base64 devem ser tratadas como potencialmente públicas.

A implementação global deve montar a URL, codificar JSON em Base64, copiar o endereço para a área de transferência e tratar falhas de forma recuperável.

Cada documento pode configurar gatilhos e pontos de extensão para complementar o comportamento global, incluindo validação prévia, definição ou extensão do payload, URL canônica, mensagens específicas e ações posteriores ao compartilhamento.

O conteúdo compartilhado, campos incluídos, validações prévias e aliases legados devem ser definidos no RCF específico do documento ou módulo quando forem regras particulares.

### RN013 - Timbre e Imagens Documentais

Documentos podem permitir upload de timbre ou imagem documental.

A infraestrutura compartilhada deve permitir ler arquivo local aceito pelo documento, armazenar Data URL em `localStorage` e restaurar a imagem durante a edição e impressão.

Formatos aceitos, posicionamento e obrigatoriedade são regras específicas de cada documento.

### RN014 - Limpeza de Campos

Documentos editáveis podem oferecer ação para limpar campos de preenchimento do usuário.

A estratégia de limpeza deve ser configurável, permitindo limpar apenas campos automáticos, campos selecionados ou escopos documentais definidos.

### RN015 - Data Gerada no Cliente

Documentos podem preencher data automaticamente no carregamento.

A infraestrutura compartilhada deve fornecer formatação local em português, enquanto o local de exibição e a necessidade da data pertencem ao documento.

### RN016 - Dependências de Terceiros em CDN

Dependências externas carregadas por CDN devem ser explícitas, versionadas e justificadas pela necessidade do documento ou módulo.

Mudanças que introduzam novas dependências externas devem registrar a decisão no RCF apropriado.

### RN017 - Compatibilidade Estática

O projeto deve continuar funcionando como site estático.

Não deve ser exigido servidor de aplicação, etapa de build, backend ou banco de dados para uso dos documentos atuais, salvo decisão arquitetural futura registrada neste RCF.

### RN018 - Redirecionamentos Legados

Arquivos legados podem redirecionar para a nova estrutura de diretórios quando necessário para preservar links públicos.

Redirecionamentos específicos devem permanecer simples, estáticos e sem acoplar regras de negócio ao arquivo legado.

### RN019 - Utilitários Não Documentais

Utilitários Web que não sejam documentos imprimíveis devem permanecer isolados das regras de impressão, salvo quando consumirem componentes compartilhados realmente genéricos.

Regras próprias desses utilitários devem ficar em RCF específico quando o módulo evoluir para além de página simples.

### RN020 - TypeScript como Fonte

TypeScript é a linguagem padrão do projeto.

Todo código de aplicação deve ter fonte em `.ts` ou `.tsx`, com JavaScript permitido apenas como artefato compilado, bookmarklet publicado, script de bootstrap de tooling Node.js ou exceção técnica documentada.

O alvo mínimo de compilação é ES2020. Alvos superiores podem ser adotados quando preservarem compatibilidade com GitHub Pages, navegadores suportados e GitHub Actions.

### RN021 - Componentes TSX

`.tsx` é o formato preferencial para componentes de interface reutilizáveis.

Novas interfaces devem privilegiar componentes tipados, reutilizáveis e desacoplados de regras específicas de documento.

### RN022 - Build, CI e Cache Incremental

O projeto deve possuir scripts NPM para desenvolvimento, compilação, build, testes, lint, type-check e validação.

O build deve reutilizar cache incremental sempre que possível, recompilando e copiando apenas artefatos alterados, sem comprometer consistência do `_site`.

Operações críticas de build devem ser fail-safe: falhas de IO, cache corrompido, lock concorrente, erro de compilação ou inconsistência de tipos devem interromper a publicação antes de gerar saída inconsistente.

### RN023 - Robustez Permanente

Toda implementação deve ser fortemente tipada, modular, reutilizável, blindada e fail-safe.

Tratamentos preventivos devem cobrir erros de compilação, inconsistências de tipos, falhas de build, problemas de cache, condições de corrida, falhas de IO e estados ausentes no navegador.

### RN024 - Otimização e Saída Dupla de Produção

Toda ferramenta publicada pelo projeto deve possuir dois artefatos gerados automaticamente pelo pipeline de build:

- Saída Web: `index.html` otimizado para hospedagem estática e uso online.
- Saída Bundle: arquivo HTML autocontido nomeado como `<nome-da-pasta>.bundle.html`, destinado a uso totalmente offline.

A saída Bundle deve incorporar internamente todos os recursos necessários ao funcionamento da ferramenta, incluindo HTML, CSS, JavaScript, fontes, imagens, SVGs, JSON, ícones e dependências estáticas aplicáveis.

O Bundle não deve depender de requisições externas para executar a ferramenta. Dependências externas usadas pela versão Web devem possuir cópia local versionada ou mapeamento de build capaz de incorporá-las ao Bundle.

Ambas as saídas devem ser produzidas em modo de produção, com minificação, eliminação de código morto, otimização de tamanho e priorização de carregamento rápido.

O build deve falhar de forma segura quando não conseguir gerar, otimizar, incorporar ou validar qualquer artefato obrigatório.

## Arquitetura

### ARQ001 - Estrutura Atual

```text
/
├── assets/
│   ├── css/
│   └── js/
├── dizimo/
├── faturamento/
│   ├── index.html
│   ├── RCF.md
│   ├── faturamento.css
│   ├── faturamento.js
│   └── faturamento.bundle.html
├── favoritos/
├── oficios/
│   └── <documento>/
│       ├── index.html
│       ├── RCF.md
│       ├── <documento>.css
│       ├── <documento>.js
│       └── <documento>.bundle.html
├── src/
│   ├── assets/
│   ├── components/
│   ├── dizimo/
│   ├── faturamento/
│   ├── favoritos/
│   └── oficios/
├── tests/
├── scripts/
├── .github/
│   └── workflows/
├── AGENTS.md
├── CNAME
├── LICENSE
├── RCF.md
├── README.md
└── continue.ia
```

### ARQ002 - Camada Compartilhada

A camada `assets/` concentra infraestrutura reutilizável:

- `assets/js/documentos.js`: utilitários e serviços compartilhados para documentos.
- `assets/css/documentos.css`: estilos documentais e componentes visuais reutilizáveis.

Documentos devem consumir essa camada e manter localmente apenas inicialização, configuração, mapeamentos e estilos exclusivos.

Os arquivos JavaScript em `assets/`, `oficios/`, `faturamento/`, `dizimo/` e `favoritos/` são artefatos públicos gerados a partir de `src/`.

### ARQ003 - Separação Recomendada para Documentos

Documentos imprimíveis devem seguir a seguinte separação lógica:

- Núcleo de documento: HTML com conteúdo formal e marcação mínima.
- Área imprimível: contêiner exclusivo para conteúdo formal.
- Toolbar: componente reutilizável externo à regra do documento.
- Configuração local: metadados, ações, mensagens e mapeamentos.
- Persistência: serviço compartilhado de autosave.
- Parametrização: serviço compartilhado de query string e JSON Base64.
- Impressão/PDF: serviço compartilhado.
- Validação: utilitários compartilhados com configuração local.
- RCF específico: contrato do documento ou módulo.

### ARQ004 - Configuração por Escopo

A configuração de ações deve respeitar precedência:

```text
global < categoria < tipo documental < documento individual
```

Uma ação mais específica pode sobrescrever, ocultar ou complementar uma ação mais geral.

### ARQ005 - Persistência Local

A persistência deve permanecer local ao navegador por padrão.

As chaves de `localStorage` devem ser estáveis e, em evolução futura, preferencialmente namespaced por categoria/documento para evitar colisões entre modelos.

### ARQ006 - Parametrização JSON Base64

A arquitetura de preenchimento parametrizado deve aceitar um parâmetro único contendo JSON codificado em Base64, por exemplo:

```text
?data=BASE64(JSON)
```

O JSON deve mapear campos por identificador estável, nome lógico ou alias documentado. A rotina deve validar estrutura, ignorar chaves desconhecidas sem falhar e aplicar os mesmos normalizadores usados na edição manual.

### ARQ007 - Fidelidade de Impressão Permanente

Toda mudança em documentos imprimíveis deve considerar fidelidade de impressão como requisito funcional, não como detalhe visual.

Mudanças em CSS, fontes, escalas, margens, tabelas, inputs, placeholders, timbre, assinatura, toolbar ou geração de PDF devem ser revisadas contra impressão/PDF.

### ARQ008 - Interface Não Imprimível

Interface Web deve usar classes ou atributos claros para indicar elementos não imprimíveis.

O padrão compartilhado deve suportar classes como `.menu`, `.nota`, `.cookie`, `.autosave` e `.no-print`, ocultando-as em impressão e no modo programático de PDF.

### ARQ009 - Decisões Arquiteturais

Todas as decisões arquiteturais devem ser registradas no RCF apropriado.

Decisões globais registradas:

- O projeto permanece estático, sem backend obrigatório.
- O RCF global contém apenas regras transversais; documentos especializados possuem RCF próprio.
- Infraestrutura com potencial de reuso fica em `assets/`.
- Documentos consomem APIs compartilhadas e mantêm localmente apenas configuração e regras específicas.
- Validações comuns pertencem ao catálogo global, mas sua aplicação é declarada por campo em cada documento.
- A prioridade permanente dos documentos imprimíveis é impressão A4 fiel quando esse formato for declarado.
- A responsividade deve beneficiar a interface Web sem modificar a precisão da área imprimível.
- O preenchimento por JSON Base64 deve ser universal para documentos, tratando Base64 como ofuscação.
- A ação global de share deve perguntar se o link será limpo ou preenchido, centralizando URL, Base64, clipboard e hooks de extensão por documento.
- Dependências externas devem ser explícitas, versionadas e registradas quando introduzidas.
- TypeScript passa a ser a fonte canônica do código de aplicação.
- `.tsx` passa a ser o padrão para componentes de interface reutilizáveis.
- JavaScript versionado em áreas públicas é artefato compilado para preservar compatibilidade retroativa com GitHub Pages.
- Scripts Node.js de build permanecem em `.mjs` por serem bootstrap executável antes da compilação TypeScript.
- O build incremental usa manifesto em `.cache/build/manifest.json` e lock de concorrência para proteger `_site`.
- Cada ferramenta com `index.html` deve gerar também um Bundle offline autocontido nomeado pelo diretório da ferramenta.
- A publicação em `_site` deve otimizar HTML, CSS, JavaScript e JSON textuais para produção sem alterar a fonte canônica.
- Recursos externos necessários ao funcionamento offline devem ser resolvidos por dependências locais versionadas e incorporados pelo pipeline de Bundle.
- O GitHub Actions deve restaurar cache incremental de build e publicar artefatos já contendo saídas Web e Bundle.

## Requisitos Não Funcionais

### RNF001 - Plataforma

Compatível com navegadores modernos em desktop e mobile, preservando impressão confiável especialmente em navegadores Chromium quando houver geração por PDF no cliente.

### RNF002 - Operação Estática

O projeto deve funcionar por hospedagem estática e acesso direto às páginas, respeitando limitações normais de APIs do navegador.

### RNF003 - Usabilidade

A edição Web deve ser simples, direta e suficiente para preenchimento rápido antes da impressão.

Alertas, notas e ferramentas devem ajudar o usuário sem aparecer no documento impresso.

### RNF004 - Manutenibilidade

Novas regras de negócio devem ser documentadas no RCF apropriado no mesmo ciclo da alteração.

Lógica duplicada entre documentos deve ser candidata a componente reutilizável.

### RNF005 - Privacidade

Dados preenchidos devem permanecer no navegador do usuário por padrão.

URLs compartilhadas com dados em Base64 devem ser tratadas como potencialmente públicas.

### RNF006 - Compatibilidade Visual

Fontes, tamanhos, espaçamentos e unidades devem favorecer previsibilidade no PDF e no papel.

Unidades físicas como `cm` e `pt` devem ser preferidas para a área imprimível quando a medida física for relevante.

### RNF007 - Evolução Controlada

Alterações devem preservar arquitetura existente e evitar reestruturações amplas sem necessidade.

Quando uma refatoração for necessária, ela deve manter comportamento atual antes de acrescentar novas capacidades.

### RNF008 - Toolchain

A toolchain deve usar tecnologias maduras, amplamente mantidas e compatíveis com GitHub Actions e GitHub Pages.

Type-check, lint, testes e build devem ser executáveis por NPM em ambiente Linux de CI e em ambiente local.
