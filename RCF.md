# RCF - Requirements & Control Framework

## 1. Identidade

**Projeto:** Modelos Web JCEM.

**Objetivo:** publicar modelos e utilitarios Web estaticos em `tools.jcem.pro`, com infraestrutura compartilhada para documentos editaveis, parametrizaveis, persistidos localmente e imprimiveis com fidelidade A4.

**Escopo global:** paginas estaticas executadas no navegador; documentos imprimiveis por categoria/modulo; utilitarios sem backend; bookmarklets em `src/favoritos/`; infraestrutura em `src/assets/` e `src/components/`; persistencia em `localStorage`; PDF client-side quando houver acao dedicada; preenchimento por query string; publicacao estatica no GitHub Pages.

## 2. Hierarquia Normativa

1. Este RCF contem apenas regras transversais.
2. Cada documento ou modulo com objetivo, campos, validacoes, layout, fluxo ou decisoes proprias deve possuir `RCF.md` especifico em seu diretorio de `src/`.
3. RCF especifico complementa o global sem alterar sua semantica; regra local nao deve ser promovida ao RCF global por conveniencia.
4. Decisoes arquiteturais, novas dependencias externas, excecoes e mudancas funcionais devem ser registradas no RCF apropriado no mesmo ciclo da alteracao.

## 3. Arquitetura de Diretorios

```text
/
├── dist/              # unica saida gerada, raiz publicada e artefato de producao
├── src/               # unica fonte canonica
│   ├── assets/
│   ├── components/
│   ├── csv-bd/
│   ├── dizimo/
│   ├── faturamento/
│   ├── favoritos/
│   └── oficios/
├── tests/
├── scripts/
├── .github/workflows/
├── AGENTS.md
├── CNAME
├── LICENSE
├── RCF.md
├── README.md
└── continue.ia
```

`src/` e a fonte canonica para TypeScript, TSX, HTML, CSS, estilos, RCFs especificos e demais fontes. Nenhum artefato gerado deve ser armazenado em `src/`, e `src/` nunca integra URL publica. A correspondencia publica e `src/<caminho-logico>` -> `dist/<caminho-logico>` -> `https://tools.jcem.pro/<caminho-logico>`.

`dist/` e reconstruivel, ignorado pelo Git, otimizado para producao, raiz unica enviada ao GitHub Pages e unico local de artefatos Web e Bundle. Ele deve conter apenas a arvore publica esperada, arquivos raiz obrigatorios de publicacao, JavaScript compilado, recursos estaticos, `index.html` otimizados e bundles ZIP. Nao deve conter fontes canonicas, caminhos com segmento `src/` ou `dist/`, diretorios vazios, rotas obsoletas, artefatos sem origem publica prevista nem `*.bundle.html` solto.

`scripts/` contem apenas automacao interna de desenvolvimento, build, manutencao, importacao e publicacao; seu conteudo nao integra a publicacao. `scripts/config.json` centraliza entradas TypeScript, bookmarklets, arquivos raiz obrigatorios e saidas publicas, evitando caminhos duplicados ou fixados em scripts.

Nao deve haver sobreposicao funcional entre `src/`, `dist/` e `scripts/`.

## 4. Documentos Imprimiveis

Documentos imprimiveis existem para gerar papel ou PDF previsivel. Quando declararem A4, margens, dimensoes, largura util, fontes, tabelas, timbres, campos, rodapes de versao, posicionamento e paginacao devem ser controlados por CSS/configuracao explicita, preferindo `cm` e `pt` quando a medida fisica for relevante.

Cada documento deve separar:

- **Interface Web:** avisos, cookies, toolbar, controles, mensagens, inputs auxiliares e feedbacks.
- **Area imprimivel:** conteudo formal que aparece no papel/PDF.

Elementos de interface devem ser identificaveis por classes/atributos como `.menu`, `.nota`, `.cookie`, `.autosave`, `.jcem-chrome` ou `.no-print`, e ocultos em `@media print`, PDF dedicado e modos programaticos equivalentes. Quando aviso de cookies e toolbar aparecerem juntos, a interface deve informar a URL canonica `https://tools.jcem.pro/<path-do-modelo>` sem `index.html` e orientar a desativar cabecalho/rodape do navegador.

A responsividade pode melhorar a edicao Web, mas nao pode alterar medidas, margens, proporcoes, alinhamentos, timbre, paginacao ou hierarquia da area imprimivel. Mudancas em CSS, fontes, escalas, placeholders, tabelas, assinatura, toolbar ou PDF exigem revisao contra impressao/PDF.

Toda area imprimivel que simule a pagina fisica deve manter aparencia de papel independentemente do tema do sistema operacional, tema do navegador, modo escuro forcado ou recurso equivalente. A superficie imprimivel deve declarar fundo branco, cores compativeis com impressao, contraste adequado, `color-scheme` claro e protecao contra ajuste forcado de cores. Apenas a interface Web externa a folha pode adaptar-se a tema claro/escuro.

Impressao deve funcionar por Ctrl+P ou equivalente e por botao dedicado quando existente. A acao dedicada deve preparar o documento, ocultar placeholders/interface, aplicar configuracao de pagina e restaurar o estado visual.

## 5. Infraestrutura Compartilhada

Recursos reutilizaveis pertencem a `src/assets/` ou `src/components/`, conforme a natureza do recurso. Documentos devem manter localmente apenas inicializacao, configuracao, mapeamentos, mensagens e estilos exclusivos.

Recursos compartilhados obrigatorios quando aplicaveis:

- cabecalho institucional, toolbar extensivel e rodape institucional;
- impressao/PDF, autosave, query string JSON Base64 e compartilhamento;
- estilos documentais comuns, formularios, datas, clipboard, timbre/imagem documental;
- validadores, normalizadores, mensagens e estados de erro reutilizaveis;
- nucleos reutilizaveis de utilitarios nao documentais, como transformacao tabular.

Cabecalho, toolbar e rodape globais sao obrigatorios para modulos publicados, exceto `dizimo` por compatibilidade visual e historica. Modulos nao podem duplicar cabecalhos/rodapes nem alterar a estrutura base; excecoes exigem previsao expressa neste RCF ou no RCF especifico.

O cabecalho global deve informar `tools.jcem.pro` e a licenca `Mozilla Public License 2.0`, com link para `https://www.mozilla.org/MPL/2.0/`. O rodape deve conter disclaimer, versao resumida da licenca, autor, isencao de responsabilidade, isencao de garantia e aviso de fornecimento "no estado em que se encontra", sem garantias de qualquer natureza, inclusive conformidade legal, regulatoria ou adequacao a finalidade especifica.

A toolbar deve ser componente reutilizavel, configuravel e extensivel por slots, hooks ou configuracao equivalente, com precedencia:

```text
global < categoria < tipo documental < documento individual
```

Acoes podem ser habilitadas, ocultadas, ordenadas, parametrizadas, sobrescritas ou complementadas sem duplicar logica. Quando existir `<nome-da-pasta>.bundle.zip` no mesmo caminho publicado do `index.html`, a toolbar pode oferecer download com icone/simbolo comum e texto acessivel.

## 6. Dados, Validacao e Persistencia

Documentos editaveis com campos de usuario devem salvar automaticamente em `localStorage`, sem botao manual obrigatorio. Chaves devem ser estaveis e, em evolucoes, preferencialmente namespaced por categoria/documento. Campos sem identificador podem receber `id` automatico para preservar compatibilidade.

O catalogo global de validadores/normalizadores deve incluir, no minimo: CPF, CNPJ, CEP, telefone fixo brasileiro, celular brasileiro, moeda BRL, `pattern` HTML e campos obrigatorios. Uso e severidade sao opt-in por documento/campo, permitindo exigir, tornar opcional, desativar ou substituir validacao. A configuracao por campo deve definir seletor, obrigatoriedade, tipo, normalizacao, mensagem, `pattern` e transformacoes simples como maiusculas. Mensagens de dominio ficam no modulo.

Campos com mascara ou formato canonico nao devem exigir que o usuario digite separadores, pontuacao ou simbolos especificos. Quando os valores reais forem compativeis com o dominio do campo, a validacao deve aceitar a entrada sem mascara ou com separadores usuais e normalizar a apresentacao apos a edicao. A rejeicao deve ocorrer por incompatibilidade material do dado, nao por ausencia ou variacao de formatacao.

Todo documento deve aceitar preenchimento integral por um parametro contendo JSON codificado em Base64, por exemplo `?data=BASE64(JSON)`. Base64 e apenas ofuscacao/transporte, nunca seguranca, autenticacao, assinatura ou criptografia. A camada compartilhada deve ler, validar estrutura, aplicar mapeamento, ignorar chaves desconhecidas sem falhar e usar os mesmos normalizadores da edicao manual. Aliases legados pertencem ao RCF especifico.

A acao global `share` deve perguntar se o usuario deseja copiar link limpo ou preenchido. No modo preenchido, deve montar URL canonica, gerar JSON Base64, copiar para a area de transferencia, tratar falhas de forma recuperavel e permitir hooks locais para validacao previa, payload, mensagens e pos-acoes. URLs com dados em Base64 sao potencialmente publicas.

Documentos podem oferecer limpeza configuravel de campos, data automatica em portugues, upload de timbre/imagem e restauracao por `localStorage`. Formatos, obrigatoriedade, posicionamento e escopos sao regras especificas.

## 7. Compatibilidade, Dependencias e Utilitarios

O projeto permanece estatico: uso das ferramentas atuais nao pode exigir backend, servidor de aplicacao, banco de dados ou etapa de build pelo usuario final. Paginas publicadas em subdiretorios devem funcionar com ou sem barra final; recursos locais devem usar caminhos absolutos a partir da raiz publicada.

Arquivos legados podem redirecionar para nova estrutura quando necessario para preservar links publicos, sem acoplar regra de negocio ao redirecionamento.

Utilitarios nao documentais ficam isolados das regras de impressao, salvo consumo de componentes realmente genericos. Regras proprias devem ficar em RCF especifico quando o modulo deixar de ser pagina simples.

Dependencias externas por CDN devem ser explicitas, versionadas, justificadas e registradas no RCF apropriado. Dependencias necessarias ao funcionamento offline devem possuir copia local versionada ou mapeamento de build que as incorpore ao Bundle.

## 8. TypeScript e Componentes

TypeScript e a fonte padrao do codigo de aplicacao. JavaScript e permitido apenas como artefato compilado, bookmarklet publicado, bootstrap Node.js de tooling ou excecao tecnica documentada. O alvo minimo e ES2020, podendo subir se preservar GitHub Pages, navegadores suportados e GitHub Actions.

`.tsx` e preferencial para componentes reutilizaveis de interface. Novas interfaces devem privilegiar componentes tipados, desacoplados e reutilizaveis.

## 9. Build, Bundle, CI e Publicacao

O projeto deve possuir scripts NPM para desenvolvimento, recarregamento automatico, compilacao, build, bundle, testes, lint, type-check e validacao. `dev-live` deve servir `dist/`, reconstruir `src/` em watch e recarregar quando artefatos publicos mudarem.

O build deve ser incremental quando possivel, mas fail-safe: erro de IO, cache corrompido, lock concorrente, falha de compilacao, inconsistencia de tipos ou validacao deve impedir publicacao. A validacao deve garantir que cada pagina funcional de `src/` esteja materializada na raiz logica correspondente em `dist/`, que nao haja segmentos publicos `src/` ou `dist/`, que arquivos raiz obrigatorios existam, que artefatos obsoletos sejam podados e que a arvore final contenha somente arquivos esperados.

Toda ferramenta com `index.html` deve gerar automaticamente:

- **Saida Web:** `index.html` otimizado para hospedagem estatica online.
- **Saida Bundle:** ZIP `<nome-da-pasta>.bundle.zip` no mesmo diretorio, contendo internamente `<nome-da-pasta>.bundle.html` autocontido.

O Bundle deve incorporar todos os recursos necessarios ao funcionamento offline, incluindo HTML, CSS, JavaScript, fontes, imagens, SVGs, JSON, icones e dependencias estaticas aplicaveis. Bibliotecas indispensaveis ao funcionamento de acoes documentais, inclusive geracao de PDF client-side e suas dependencias estaticas, devem ser incorporadas ao HTML interno do ZIP sem depender de CDN, importacao dinamica remota ou caminho local externo ao bundle. Ele nao pode depender de requisicoes externas. Apenas o ZIP deve ser publicado; HTML autocontido solto e proibido. ZIP com Deflate no maior nivel disponivel e o formato vigente por ser compativel com Node.js, GitHub Actions e usuarios; outro formato exige ganho real sem dependencia operacional incompativel.

Saidas Web e Bundle devem ser produzidas em modo de producao, com minificacao, eliminacao de codigo morto, otimizacao de tamanho e carregamento rapido, sem alterar `src/`. Falha ao gerar, otimizar, incorporar ou validar qualquer artefato obrigatorio deve interromper o build.

O workflow de publicacao deve produzir exatamente um artefato Pages oficial por execucao, usando `actions/upload-pages-artifact` sobre `dist/`, incluindo `CNAME` e `.nojekyll`. Uploads duplicados do mesmo conteudo nao devem coexistir. Pull requests devem validar, testar e gerar artefatos; deploy ocorre apenas no push da branch configurada.

Workflows devem usar acoes oficiais compativeis com o runtime JavaScript vigente do GitHub Actions, sem variaveis de escape para runtimes obsoletos. CI deve ter limite maximo de 10 minutos; caches so devem ser usados quando o ganho esperado superar restauracao e gravacao para o tamanho real do projeto.

## 10. Robustez e Qualidade

Implementacoes devem ser fortemente tipadas, modulares, reutilizaveis, previsiveis, deterministicas, rastreaveis e fail-safe. Devem tratar preventivamente erros de compilacao, tipos, build, cache, IO, estados ausentes no navegador, condicoes de corrida, dados invalidos e falhas recuperaveis sem corrupcao silenciosa.

Novas regras de negocio devem ser documentadas no RCF apropriado. Logica duplicada entre documentos e candidata a compartilhamento. Refatoracoes necessarias devem preservar comportamento antes de acrescentar capacidades.

## 11. Requisitos Nao Funcionais

- **Plataforma:** navegadores modernos desktop/mobile, com impressao confiavel, especialmente Chromium quando houver PDF client-side.
- **Operacao estatica:** hospedagem estatica e acesso direto as paginas, respeitando limites normais de APIs do navegador.
- **Usabilidade:** edicao simples e rapida; alertas, notas e ferramentas auxiliam sem aparecer no impresso.
- **Privacidade:** dados preenchidos ficam no navegador por padrao; URLs Base64 sao publicas em potencial.
- **Compatibilidade visual:** fontes, tamanhos, espacamentos e unidades devem favorecer previsibilidade em PDF/papel.
- **Toolchain:** tecnologias maduras, mantidas e compativeis com GitHub Actions/GitHub Pages; type-check, lint, testes e build executaveis via NPM em Linux CI e ambiente local.

## 12. Decisoes Arquiteturais Vigentes

- O projeto permanece estatico, sem backend obrigatorio.
- `src/` e a unica fonte canonica; `dist/` e a unica saida gerada, publicada e produtiva.
- A raiz do repositorio concentra apenas configuracao, documentacao e metadados esperados.
- Infraestrutura reutilizavel fica em `src/assets/` ou `src/components/`.
- Documentos consomem APIs compartilhadas e mantem localmente apenas configuracao e regras especificas.
- Validacoes comuns pertencem ao catalogo global; aplicacao e declarada por campo.
- Impressao A4 fiel e requisito funcional permanente quando o formato for declarado.
- Responsividade nao modifica a precisao da area imprimivel.
- JSON Base64 e universal para documentos e deve ser tratado como ofuscacao.
- A acao global de compartilhamento centraliza URL, Base64, clipboard e hooks.
- Dependencias externas sao versionadas, justificadas e registradas.
- TypeScript e fonte canonica de aplicacao; TSX e preferencial para componentes reutilizaveis.
- Scripts Node.js em `.mjs` dentro de `scripts/` sao bootstrap executavel da toolchain.
- Build incremental usa manifestos/locks em `.cache/build/` quando util e protege `dist/`.
- Entradas de build ficam em `scripts/config.json`.
- Cada ferramenta com `index.html` gera ZIP offline no mesmo caminho publico.
- Publicacao estatica usa `dist/` como raiz unica do Pages.
- A validacao bloqueia `src/` ou `dist/` como segmento/referencia publica, arquivos obsoletos, diretorios vazios e `*.bundle.html` solto.
- URLs internas de assets e bundles devem ser estaveis com ou sem barra final, preferencialmente root-relative.
