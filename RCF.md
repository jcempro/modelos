# RCF - Requirements & Control Framework

## 1. Identidade

**Projeto:** Modelos Web JeanCarloEM.

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

A Area imprimivel e a unica regiao que pode ser limitada artificialmente pelas dimensoes da folha. A Area de aplicacao, incluindo cabecalho global, rodape global, toolbar, paineis auxiliares, alertas, notificacoes, navegacao e apoios de edicao, deve permanecer responsiva e usar a largura disponivel da viewport sem herdar limites de A4. Modulos imprimiveis devem apresentar a regiao externa a folha com fundo diferenciado, de modo semelhante a editores de documentos e visualizadores de PDF, tornando evidente onde a pagina fisica comeca e termina.

O layout visual dos modulos imprimiveis deve ser centralizado em infraestrutura global opcional. Container de workspace, area cinza externa, preview, regiao de formularios, posicionamento da folha, scroll, dimensionamento, margens da viewport e comportamento responsivo nao pertencem ao modulo. O workspace deve preservar area util suficiente para edicao e revisao, empilhando formulario/preview quando a largura nao comportar revisao lateral legivel e adotando layout lateral apenas quando houver largura real para ambos. O modulo imprimivel apenas renderiza o conteudo da folha, declara formularios internos ou externos, vincula campos aos elementos do documento e fornece configuracoes especificas. Ferramentas nao imprimiveis nao precisam ativar essa infraestrutura e nao devem receber workspace residual.

Estilizacao visual estrutural da aplicacao nao pertence aos modulos. Aparencia do preview, fundo externo, fundo morto, sombras, bordas, containers, espacamentos estruturais, transicoes, scroll de preview/formulario, organizacao entre formulario e folha, estados visuais globais e contraste entre cabecalho, toolbar, formulario, preview e rodape pertencem ao framework compartilhado. Modulos podem manter apenas estilos do conteudo interno da folha e ajustes semanticos locais de campos, tabelas ou blocos especificos que nao sejam reutilizaveis.

A responsividade pode melhorar a edicao Web, mas nao pode alterar medidas, margens, proporcoes, alinhamentos, timbre, paginacao ou hierarquia da area imprimivel. Mudancas em CSS, fontes, escalas, placeholders, tabelas, assinatura, toolbar ou PDF exigem revisao contra impressao/PDF.

Toda area imprimivel que simule a pagina fisica deve manter aparencia de papel independentemente do tema do sistema operacional, tema do navegador, modo escuro forcado ou recurso equivalente. A superficie imprimivel deve declarar fundo branco, cores compativeis com impressao, contraste adequado, `color-scheme` claro e protecao contra ajuste forcado de cores. Apenas a interface Web externa a folha pode adaptar-se a tema claro/escuro.

Impressao deve funcionar por Ctrl+P ou equivalente e por botao dedicado quando existente. A acao dedicada deve preparar o documento, ocultar placeholders/interface, aplicar configuracao de pagina e restaurar o estado visual. Quando a propria folha ja define dimensoes e margens internas A4, o PDF dedicado nao deve acrescentar margem externa que provoque escala, overflow ou pagina extra.

## 5. Infraestrutura Compartilhada

Recursos reutilizaveis pertencem a `src/assets/` ou `src/components/`, conforme a natureza do recurso. Documentos devem manter localmente apenas inicializacao, configuracao, mapeamentos, mensagens e estilos exclusivos.

Recursos compartilhados obrigatorios quando aplicaveis:

- cabecalho institucional, toolbar extensivel e rodape institucional;
- impressao/PDF, autosave, query string JSON Base64 e compartilhamento;
- layout de workspace/preview/formularios, estilos documentais comuns, datas, clipboard, timbre/imagem documental;
- validadores, normalizadores, mensagens e estados de erro reutilizaveis;
- nucleos reutilizaveis de utilitarios nao documentais, como transformacao tabular.

Cabecalho, toolbar e rodape globais sao obrigatorios para todos os modulos publicados. Modulos nao podem duplicar cabecalhos/rodapes nem alterar a estrutura base; excecoes exigem previsao expressa neste RCF ou no RCF especifico.

O cabecalho e o rodape globais devem consumir uma unica fonte institucional compartilhada. A autoria exibida na interface deve ser apresentada exclusivamente como `JeanCarloEM`, sempre com hyperlink para `https://www.jeancarloem.com`, aberto em nova aba com `rel="noopener noreferrer"` ou equivalente. Siglas como `JCEM` podem permanecer apenas em identificadores tecnicos, dominio, namespace, historico ou nome de projeto quando houver justificativa funcional.

O cabecalho global deve apresentar a marca global à esquerda do nome do projeto e, à direita, o estado de autosave, o switch de tema, a licenca `Mozilla Public License 2.0` e a marca de autoria, nesta ordem. A licenca deve apontar para `https://www.mozilla.org/MPL/2.0/`, manter altura e alinhamento compativeis com os controles adjacentes e preceder imediatamente a marca de autoria. A marca de autoria usa `https://jcem.pro/logo/64-yellow.png`, aponta para `https://www.jeancarloem.com` e permanece remota na versao Web publicada. Exclusivamente durante o build do Bundle, o construtor deve baixar e incorporar seu conteudo como Data URL no catalogo embutido, sem armazena-lo como asset local distinto. O dominio e a frase institucional descritiva nao devem ocupar o cabecalho. Em documentos editaveis, o cabecalho deve ser sticky por CSS, mantendo visiveis a toolbar e o estado de autosave sem listener de rolagem ou calculo de dimensao em JavaScript. O rodape global deve permanecer no fluxo da pagina, sem fixacao na viewport, com respiro vertical e separacao entre blocos e paragrafos, reunindo autoria, licenca, informacoes institucionais e disclaimer/isencao de responsabilidade como um unico contexto juridico, evitando repeticao textual.

Avisos institucionais, disclaimer, isencao de responsabilidade, limitacoes de garantia e textos complementares possuem finalidade exclusivamente informativa. Eles devem deixar claro que os recursos nao constituem consultoria, servico gerenciado, vinculo, autorizacao para uso indevido, promessa de resultado nem assuncao de responsabilidade pelo autor, inclusive por danos, perdas, bloqueios, sancoes, incidentes, violacoes, reclamacoes ou responsabilidades civis, criminais, trabalhistas, administrativas, regulatorias, contratuais ou de qualquer outra natureza. Esses avisos nao alteram, substituem, restringem, ampliam nem modificam os direitos, deveres, permissoes, limitacoes ou condicoes definidos pela licenca do software. A licenca permanece o unico instrumento normativo que disciplina uso, redistribuicao, modificacao e demais direitos relacionados ao codigo.

A toolbar deve ser componente reutilizavel, configuravel e extensivel por slots, hooks ou configuracao equivalente, ocupar a largura disponivel da janela como faixa funcional distinta e sutil, e respeitar a precedencia:

```text
global < categoria < tipo documental < documento individual
```

Acoes podem ser habilitadas, ocultadas, ordenadas, parametrizadas, sobrescritas ou complementadas sem duplicar logica. Quando existir `<nome-da-pasta>.bundle.zip` no mesmo caminho publicado do `index.html`, a toolbar pode oferecer download com icone/simbolo comum e texto acessivel.

A renderizacao visual da toolbar pertence exclusivamente a camada global. Modulos podem declarar apenas configuracao, campos, payloads, callbacks, hooks, validacoes e acoes adicionais; nao devem definir icones, estados visuais, tooltip, separadores, espacamentos estruturais nem aparencia base dos botoes. Botoes globais precedem botoes especificos do modulo. Separadores sao declarativos e representam apenas respiro e linha vertical discreta.

Responsividade, dimensoes, compactacao visual, deteccao de rolagem simples e alternancia de menus da GUI global pertencem exclusivamente ao CSS/SASS. JavaScript nao deve registrar listeners de `scroll` ou `resize`, calcular geometria de componentes nem sustentar estados de layout; seu uso limita-se a comportamento funcional e complemento opcional de acessibilidade. A navegacao lateral deve usar `input[type="checkbox"]`, `label` e seletores de irmaos, permanecer integrada entre cabecalho e rodape, reservar somente o trilho retraido e expandir uma superficie unica por toda sua altura sobre o conteudo, com transicao CSS curta e suave. Durante a rolagem, o trilho deve alcançar o topo; uma animacao CSS vinculada ao scroll desloca progressivamente marca, nome e toolbar para a direita somente enquanto a protecao for necessaria, preservando o alinhamento original no topo da pagina. O eixo dos icones permanece centralizado e imovel durante a transicao, e o acionador usa o icone Font Awesome `f0c9`.

O indicador de persistencia deve exibir a forma compacta `Local e automático`, priorizar visualmente `automático` e nunca truncar palavras com elipse; o tooltip mantém a descrição integral. Deve ocultar progressivamente o complemento e depois todo o texto por breakpoints CSS, preservando somente o icone em largura critica. Cor e estados do indicador devem manter contraste proprio nos temas claro e escuro. O icone de autosave deve possuir escala legivel e animação respiratória sutil, fluida, curta e integralmente definida em CSS, sem temporizador visual em JavaScript e com desativacao sob `prefers-reduced-motion`. Módulos sem persistência automática devem declarar essa inaplicabilidade ao chrome global, ao qual compete omitir integralmente texto e ícone; o módulo não deve ocultá-los por CSS ou manipulação local. O switch de tema deve usar icone vetorial dimensionado e centralizado de forma equivalente aos demais controles, evitando glifo textual visualmente subdimensionado e contraste excessivo. O badge de licença deve permanecer compacto e tipograficamente subordinado aos controles principais.

A toolbar deve ser dirigida por configuracao declarativa, preferencialmente JSON ou estrutura de dados equivalente. Estrutura, ordem, grupos, separadores, icones, acoes, estados, permissoes, atalhos, comportamento visual e vinculos devem ser centralizados em metadados, permitindo alterar ordem, itens, icones, grupos, estados, hooks e implementacoes sem modificar a logica interna de construcao. A camada global deve inferir renderizacao, eventos, callbacks, estados, atalhos, permissoes e integracoes, evitando logica especifica por botao.

Icones de toolbar e indicadores globais devem usar Font Awesome gratuito instalado via NPM em pacotes modulares, importando somente definicoes realmente utilizadas para permitir tree shaking, minificacao, bundle offline e GitHub Pages sem carregar a biblioteca completa. A selecao deve aceitar um ou varios icones simultaneos por componente, por `iconName`, codigo Unicode equivalente ou identificador Font Awesome. Icones Unicode, emojis ou simbolos textuais nao devem ser usados como icones de acoes. Cores e estados de hover dos icones devem ser configuraveis por CSS centralizado e especificos por tema, sem logica local de modulo. Tooltips devem ser globais, declarativos por `hint` e posicionados por biblioteca pequena, mantida e compativel com bundle offline. Salvar localmente usa `f0c7`, abrir arquivo usa `f07c`, e um separador estrutural deve existir exatamente entre imprimir e limpar. A versao offline combina o icone vigente com `f358` sem rotulo visivel; exclusivamente nesse componente, o primeiro icone representa a acao principal e deve permanecer maior, opaco e visualmente dominante, enquanto `f358` atua como indicador complementar menor e de opacidade reduzida.

A infraestrutura de autoria, creditos, licenca, disclaimer e respectivas validacoes de integridade e excecao deliberada a modularizacao plenamente transparente. Ela deve preservar qualidade, estabilidade e conformidade, mas pode privilegiar resistencia a adulteracao por meio de ofuscacao de constantes e textos, reconstrucao deterministica, fragmentacao, pulverizacao entre modulos, composicao nao linear, derivacoes deterministicas, funcoes puras de reconstrucao, geracao indireta de constantes, codificacao de dados, transformacoes reversiveis sem segredo externo, validacoes cruzadas, verificacao de integridade, eliminacao de referencias textuais diretas, nomenclatura nao alusiva, reducao de pontos unicos de alteracao e tecnicas equivalentes. Esses mecanismos destinam-se exclusivamente a proteger autoria, creditos, licenca e avisos legais, sem interferir nas demais funcionalidades.

## 6. Dados, Validacao e Persistencia

Documentos editaveis com campos de usuario devem salvar automaticamente em `localStorage`, sem botao manual obrigatorio. Chaves devem ser estaveis e, em evolucoes, preferencialmente namespaced por categoria/documento. Campos sem identificador podem receber `id` automatico para preservar compatibilidade.

O catalogo global de validadores/normalizadores deve incluir, no minimo: CPF, CNPJ, CEP, telefone fixo brasileiro, celular brasileiro, moeda BRL, `pattern` HTML e campos obrigatorios. Uso e severidade sao opt-in por documento/campo, permitindo exigir, tornar opcional, desativar ou substituir validacao. A configuracao por campo deve definir seletor, obrigatoriedade, tipo, normalizacao, mensagem, `pattern` e transformacoes simples como maiusculas. Mensagens de dominio ficam no modulo.

Campos com mascara ou formato canonico nao devem exigir que o usuario digite separadores, pontuacao ou simbolos especificos. Quando os valores reais forem compativeis com o dominio do campo, a validacao deve aceitar a entrada sem mascara ou com separadores usuais e normalizar a apresentacao apos a edicao. A rejeicao deve ocorrer por incompatibilidade material do dado, nao por ausencia ou variacao de formatacao.

Todo documento deve aceitar preenchimento integral por um parametro contendo JSON codificado em Base64, por exemplo `?data=BASE64(JSON)`. Base64 e apenas ofuscacao/transporte, nunca seguranca, autenticacao, assinatura ou criptografia. A camada compartilhada deve ler, validar estrutura, aplicar mapeamento, ignorar chaves desconhecidas sem falhar e usar os mesmos normalizadores da edicao manual. Aliases legados pertencem ao RCF especifico.

A acao global `share` deve perguntar se o usuario deseja copiar link limpo ou preenchido. No modo preenchido, deve montar URL canonica, gerar JSON Base64, copiar para a area de transferencia, tratar falhas de forma recuperavel e permitir hooks locais para validacao previa, payload, mensagens e pos-acoes. URLs com dados em Base64 sao potencialmente publicas.

Documentos podem oferecer limpeza configuravel de campos, data automatica em portugues, upload de timbre/imagem e restauracao por `localStorage`. Formatos, obrigatoriedade, posicionamento e escopos sao regras especificas.

Documentos editaveis podem oferecer exportacao e importacao local de preenchimento em JSON pela toolbar global. O envelope minimo deve conter identificador do modulo, versao, schema, timestamp, dados e informacoes de compatibilidade. A abertura deve validar extensao, modulo, schema e versao antes de preencher campos. Arquivos de outro modulo devem ser recusados com mensagem adequada. Modulos complexos fornecem payload e aplicador proprios; modulos simples podem usar serializacao generica da camada compartilhada.

Autosave e indicadores visuais nao podem roubar foco, mover cursor, perder selecao ou disparar renderizacoes parciais que interrompam digitacao. Durante eventos de digitacao, a camada compartilhada deve persistir o valor vigente sem normalizacao destrutiva; normalizacoes e alertas que possam alterar o valor devem ocorrer em eventos de consolidacao, como `blur`, ou em fluxos explicitamente acionados pelo usuario.

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

O artefato Pages deve expor `version.json` na raiz, com somente a revisao imutavel incorporada aos scripts e bundles daquela execucao e o timestamp Unix do deploy. Esse indexador nao pertence a `src/`, `dist/` versionado nem a commit direto: deve ser criado exclusivamente no job de publicacao da branch primaria, depois da validacao integral e antes do upload do artefato, de modo que somente um deploy concluido o torne publicamente observavel. A revisao deve mudar para toda publicacao originada por alteracao direta de modulo ou indireta de infraestrutura global que alcance os bundles.

Cada pagina e bundle distribuido deve executar uma unica verificacao assincrona de atualizacao por ciclo completo de carregamento, sem polling, intervalo ou repeticao agendada. A tentativa primaria consulta o indexador produtivo com timeout e tratamento integral de excecao; somente diante de falha de rede, resposta HTTP invalida ou payload inconsistente pode ocorrer uma unica tentativa alternativa com query string anti-cache e politica de cache reduzida, encerrando definitivamente depois dela. Falha, bloqueio, timeout, CORS ou indisponibilidade nao pode bloquear, degradar nem produzir erro visivel na interface.

Quando a revisao local diferir da publicada, o chrome global deve adicionar somente a classe de estado `.has-update` ao contêiner de metadados. O indicador, previamente presente e oculto por CSS, deve aparecer imediatamente depois do autosave quando aplicavel, usar Font Awesome `f019`, margens laterais ampliadas, tooltip exato `há atualização disponível, baixe e substitua`, link nativo para a pagina publica correspondente e alerta amarelo/laranja com contraste proprio em claro e escuro. Visibilidade, cor, margens e animacao continua, suave e acessivel pertencem exclusivamente ao CSS/SASS; `prefers-reduced-motion` deve desativar a animacao.

Workflows devem usar acoes oficiais compativeis com o runtime JavaScript vigente do GitHub Actions, sem variaveis de escape para runtimes obsoletos. CI deve ter limite maximo de 10 minutos; caches so devem ser usados quando o ganho esperado superar restauracao e gravacao para o tamanho real do projeto.

## 10. Robustez e Qualidade

Implementacoes devem ser fortemente tipadas, modulares, reutilizaveis, previsiveis, deterministicas, rastreaveis e fail-safe. Devem tratar preventivamente erros de compilacao, tipos, build, cache, IO, estados ausentes no navegador, condicoes de corrida, dados invalidos e falhas recuperaveis sem corrupcao silenciosa.

A arquitetura deve privilegiar elevada coesao, baixo acoplamento, separacao clara de responsabilidades e reutilizacao sistematica. Rotinas reaproveitaveis por mais de um fluxo devem ser abstraidas para funcao ou componente compartilhado. Funcionalidades devem ser divididas em unidades especializadas sempre que isso preservar encapsulamento, independencia e manutencao.

Funcoes devem ser pequenas, deterministicas, autocontidas e semanticamente bem definidas, com uma finalidade clara. Funcoes extensas ou responsaveis por multiplas etapas devem ser evitadas em favor de composicao entre microfuncoes. Arquivos excessivamente grandes tambem devem ser evitados; responsabilidades distintas devem ser segregadas em arquivos especializados quando apropriado.

Toda funcao publica ou privada deve possuir comentario de documentacao objetivo, exceto na infraestrutura protegida de autoria, creditos, licenca e disclaimer. A documentacao deve indicar finalidade, motivo de existencia, contexto de uso, parametros, retornos, efeitos colaterais, principais casos de uso, pre-condicoes, pos-condicoes e restricoes relevantes quando aplicaveis, evitando repetir literalmente o codigo ou adicionar texto prolixo.

Comentarios de fluxo devem ser extremamente sucintos e usados apenas para tornar identificavel a linha geral do processamento, como inicializacao, preparacao, processamento, validacoes, consolidacao, persistencia, renderizacao e finalizacao. Nao devem explicar instrucoes elementares da linguagem.

A infraestrutura protegida de autoria, creditos, licenca e disclaimer nao deve possuir comentarios que revelem arquitetura interna, estrategia de protecao, fluxo especifico, criterios de validacao ou logica de reconstrucao. Nomes explicitamente descritivos devem ser evitados quando facilitarem localizacao ou adulteracao. A implementacao deve permanecer suficientemente pulverizada e desacoplada para reduzir sua identificabilidade imediata, sem comprometer desempenho, estabilidade, manutenibilidade ou conformidade. Essa excecao nao se aplica ao restante da base, que permanece sujeito a clareza, documentacao, organizacao e rastreabilidade.

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
- A toolbar global centraliza configuracao declarativa, renderizacao, metadados, icones Font Awesome modulares, cores CSS, tooltips, separadores, exportacao/importacao local e ordem das acoes.
- Autoria, creditos, licenca e disclaimer podem usar infraestrutura protegida contra adulteracao, sem interferir nas demais funcionalidades.
- Dependencias externas sao versionadas, justificadas e registradas.
- TypeScript e fonte canonica de aplicacao; TSX e preferencial para componentes reutilizaveis.
- Scripts Node.js em `.mjs` dentro de `scripts/` sao bootstrap executavel da toolchain.
- Build incremental usa manifestos/locks em `.cache/build/` quando util e protege `dist/`.
- Entradas de build ficam em `scripts/config.json`.
- Cada ferramenta com `index.html` gera ZIP offline no mesmo caminho publico.
- Publicacao estatica usa `dist/` como raiz unica do Pages.
- A validacao bloqueia `src/` ou `dist/` como segmento/referencia publica, arquivos obsoletos, diretorios vazios e `*.bundle.html` solto.
- URLs internas de assets e bundles devem ser estaveis com ou sem barra final, preferencialmente root-relative.

## 13. Dashboard, navegação, tema, consentimento e estilos

`src/index.html` é o dashboard publicado e não integra bundles. O catálogo em `src/assets/config/apps.json` é a fonte configurável de aplicativos, rota padrão e orientação da navegação. `defaultApp: null` mantém o workspace sem aplicativo aberto; um identificador válido ativa o redirecionamento. Nos aplicativos, a navegação global deve formar uma barra lateral fixa abaixo do cabeçalho e acima do rodapé, reservar no conteúdo somente a largura retraída e expandir sobre o conteúdo sob comando acessível alinhado ao topo da barra. O trilho retraído deve manter superfície cromática própria e contínua por toda a altura do shell, sem cortes ou exposição do fundo durante a rolagem, em ambos os temas. A expansão não deve deslocar a superfície documental. Links públicos absolutos devem permanecer funcionais em execução `file:`.

Interface não imprimível suporta temas claro e escuro. Ambos devem adaptar explicitamente fundos, textos, links, bordas, toolbar, controles, ícones e navegação com contraste legível, distinguindo fundo global, painel, grupo, controle, hover, foco e estado desabilitado por tons próximos mas perceptíveis. O tema escuro usa paleta neutra grafite/chumbo, sem matiz azul dominante ou superfície monótona; o tema claro preserva hierarquia equivalente por superfícies claras graduais e não pode depender de herança cromática ambígua. Painel local de módulo não pode conservar superfície fixa incompatível com o tema nem combinar texto herdado e fundo sem contraste. O dashboard raiz mantém composição própria e deve oferecer o mesmo switch persistente, sem incorporar o contêiner documental. A preferência explícita usa armazenamento local; em sua ausência prevalece `prefers-color-scheme`, com claro como fallback. A folha imprimível permanece branca e em esquema claro. `404.html` reutiliza o catálogo, preserva redirecionamentos válidos e não carrega consentimento ou persistência.

Todas as versões exibem aviso explícito sobre cookies essenciais e armazenamento local. Exclusivamente em HTTPS público, `src/assets/js/consent.ts` carrega o Silktide Consent Manager por CDN na versão declarada em `src/assets/config/consent.json`. Sem aceitação registrada, uma camada modal bloqueia o uso; recusa mantém o bloqueio. Bundles offline não carregam CDN e permanecem autossuficientes.

SCSS é a única fonte canônica de estilos. O build transpila todo `.scss` não parcial para CSS comprimido no mesmo caminho lógico em `dist/`; HTML e consumidores públicos referenciam somente o CSS gerado. Logotipos vetoriais ficam em `src/assets/brand/logo.svg` para o workspace e `src/<modulo>/logo.svg` para cada aplicativo. O catálogo deve referenciar esses logotipos na navegação e no dashboard e manter representação `data:` equivalente para consumo autocontido dos Bundles; o cabeçalho documental deve exibir o logotipo do aplicativo junto à marca Tools JeanCarloEM. Logos devem responder ao tema por tratamento visual sem perder identidade. O cabeçalho deve apresentar a licença como badge compacto, acessível e profissional, sem linha textual redundante.

`dev-live` deve concluir build Web e bundles antes de abrir a porta, servir `dist/` sem cache, observar `src/`, serializar rebuilds concorrentes, regenerar Web e todos os ZIPs a cada alteração e emitir reload somente após sucesso integral. Em Windows, deve executar os scripts Node canônicos diretamente, sem subprocesso NPM aninhado. Porta ocupada deve produzir diagnóstico controlado e encerrar sem processo órfão.

Bundles devem incorporar o catálogo de aplicativos no próprio HTML, com rotas convertidas para URLs absolutas de `https://tools.jcem.pro/`. A navegação offline deve consumir esse catálogo embutido sem requisição local ou remota; recursos funcionais continuam integralmente locais.

# Aditivo Normativo — Páginas Estáticas, GitHub Pages e Recursos Compartilhados

Sem prejuízo das demais disposições deste RCF, passam a integrar sua arquitetura as seguintes diretrizes relativas às páginas HTML especiais, ao pipeline de build e à publicação no GitHub Pages.

---

# 1. Páginas Especiais

O projeto poderá conter páginas HTML especiais localizadas diretamente em `./src/`, destinadas exclusivamente à infraestrutura de publicação, compatibilidade ou suporte.

Atualmente:

```text
./src/index.html
./src/404.html
./src/NOSCRIPT.html
```

Essas páginas não integram a aplicação principal, não participam do bundling e permanecem documentos HTML independentes, salvo disposição expressa deste RCF.

Todas participam normalmente do build e devem receber as mesmas otimizações compatíveis aplicadas às demais páginas HTML.

---

# 2. index.html

`./src/index.html` constitui a página inicial publicada pelo GitHub Pages.

Permanece como HTML independente durante todo o pipeline, sem bundling.

Durante o build deverá receber otimização agressiva, incluindo, quando aplicável, minificação, otimização estrutural, compactação de CSS e JavaScript incorporados, eliminação de redundâncias, remoção de comentários e demais otimizações compatíveis.

---

# 3. 404.html

`./src/404.html` constitui a página de tratamento de caminhos inexistentes no GitHub Pages.

Permanece como HTML independente, não integra bundles e recebe o mesmo nível de otimização aplicado às demais páginas publicadas.

Além da exibição convencional do erro 404, deverá tentar recuperar automaticamente redirecionamentos cadastrados.

Para isso, deverá:

* normalizar (canonicalizar) a URL solicitada, eliminando diferenças irrelevantes como protocolo convencional, capitalização do host, portas padrão, barras finais e demais representações equivalentes;
* remover automaticamente referências à própria `404.html`, caso presentes;
* considerar apenas caminhos lógicos do site, ignorando requisições destinadas diretamente a arquivos;
* derivar deterministicamente a localização de `data.json` correspondente ao diretório solicitado;
* obter esse arquivo por requisição HTTP;
* validar integralmente sua estrutura antes de qualquer utilização.

Inicialmente, considera-se válida exclusivamente a estrutura:

```json
[
    "https://destino"
]
```

O documento deverá ser um JSON válido contendo exatamente um único elemento, obrigatoriamente uma URL absoluta válida.

Somente após validação completa deverá ocorrer o redirecionamento.

Qualquer erro de rede, ausência do arquivo, JSON inválido, estrutura incompatível, URL inválida ou qualquer outra inconsistência deverá degradar silenciosamente para o fluxo normal da página 404, sem mensagens ou interrupções ao usuário.

---

# 4. NOSCRIPT.html

`./src/NOSCRIPT.html` constitui exclusivamente a fonte oficial do conteúdo exibido quando JavaScript estiver desabilitado.

Não deverá:

* ser publicado;
* possuir URL pública;
* integrar bundles;
* ser copiado para a saída do build;
* tornar-se página navegável.

Sua única finalidade é servir como documento-fonte para geração automática do conteúdo `<noscript>` de todas as páginas HTML publicadas.

---

# 5. Documento-fonte

Para facilitar desenvolvimento, manutenção, testes e revisão visual, `NOSCRIPT.html` deverá permanecer um documento HTML completo, válido e autocontido, podendo conter normalmente `DOCTYPE`, `html`, `head`, `meta`, `title`, `style`, `body` e quaisquer outros elementos necessários ao seu funcionamento independente.

Essa estrutura existe apenas para edição e manutenção, não representando a estrutura final incorporada às demais páginas.

---

# 6. Fonte única de verdade

Todo conteúdo, estrutura, estilos e comportamento apresentados pelo `<noscript>` deverão derivar exclusivamente de `NOSCRIPT.html`.

Não será permitida duplicação dessa implementação.

Qualquer alteração nesse documento deverá refletir automaticamente em todas as páginas HTML geradas.

---

# 7. Extração e Transformação

A incorporação de `NOSCRIPT.html` não poderá ocorrer por simples cópia textual.

O pipeline deverá interpretar estruturalmente o documento e extrair apenas os elementos semanticamente necessários à renderização do `<noscript>`.

A seleção deverá ser automática, resiliente e independente da organização atual do documento, evitando dependência de posições fixas, substituições textuais ou expressões regulares.

Estruturas próprias de um documento HTML completo — como `DOCTYPE`, `html`, `head`, `meta`, `title` e equivalentes — deverão ser descartadas quando não contribuírem para a renderização final.

Por outro lado, toda estrutura, conteúdo, atributos e estilos necessários à reprodução fiel da experiência visual deverão ser preservados, podendo ser reorganizados, adaptados, consolidados, normalizados e minificados para produzir um `<noscript>` semanticamente correto e otimizado.

---

# 8. Inserção

O `<noscript>` derivado de `NOSCRIPT.html` deverá ser incorporado automaticamente em todas as páginas HTML publicadas, incluindo:

* `index.html`;
* `404.html`;
* páginas produzidas por bundles;
* páginas geradas automaticamente;
* quaisquer outros documentos HTML distribuídos.

Nenhuma página publicada poderá deixar de conter essa implementação.

---

# 9. Estilos

Os estilos provenientes de `NOSCRIPT.html` deverão ser transformados juntamente com seu conteúdo.

O pipeline deverá minimizar conflitos entre seus estilos e os da página hospedeira, bem como impedir interferência inversa, preservando isolamento, previsibilidade visual, aderência ao tema global e compatibilidade com qualquer página em que seja incorporado.

---

# 10. Pipeline

O build deverá reconhecer explicitamente a finalidade de cada página especial, garantindo que:

* `index.html` permaneça HTML independente publicado;
* `404.html` permaneça HTML independente publicado;
* `NOSCRIPT.html` seja utilizado exclusivamente como documento-fonte;
* `NOSCRIPT.html` nunca seja publicado;
* nenhuma dessas páginas participe do bundling;
* toda página HTML publicada incorpore automaticamente o `<noscript>` oficial.

---

# 11. Otimização

Toda página HTML produzida pelo projeto — incluindo `index.html`, `404.html` e páginas geradas por bundles — deverá passar por otimização agressiva durante o build.

O pipeline deverá aplicar todas as otimizações compatíveis para reduzir tamanho, redundâncias, custo de carregamento e processamento, preservando integralmente o comportamento funcional.

A ausência de bundling não reduz o nível de otimização esperado.

Todo o processamento deverá permanecer determinístico, reprodutível, desacoplado e resiliente a futuras alterações estruturais dos documentos HTML.
