# Modelos JeanCarloEM

Projeto estático para modelos e utilitários Web publicados em GitHub Pages.

O caminho `/` publica um workspace sem aplicativo aberto por padrão. Catálogo, aplicativo inicial e orientação da navegação ficam em `src/assets/config/apps.json`. Temas claro/escuro são persistidos localmente sem alterar a folha impressa. Estilos-fonte usam SCSS e são transpilados para CSS comprimido no build.

O site público carrega o Silktide Consent Manager por CDN conforme `src/assets/config/consent.json`; bundles offline não carregam recursos remotos e exibem o aviso de cookies essenciais e armazenamento local.

O estado técnico retomável está em [handoff.md](handoff.md).

## Desenvolvimento

```bash
npm install
npm run dev
```

Com recarregamento automático:

```bash
npm run dev-live
```

## Validação e Build

```bash
npm run check
npm run build
npm run publish
```

`src/` é a única fonte canônica para TypeScript, TSX, HTML, CSS e RCFs específicos. `dist/` é a única saída gerada: raiz publicada, artefato de produção e local dos bundles offline `*.bundle.zip`.

`scripts/config.json` é a fonte central da toolchain: caminhos, URL pública, servidor local, dependências offline, entradas de build e contrato GitHub Pages. `build:web`, `build:offline-bundles`, `validate:publication` e `validate:all` explicitam a especialização; `publish`/`agent:publish` executa o fluxo all-in-one de preparação, enquanto `publish:pages` é a mesma entrada usada pelo CI.

Toolbar, ícones, tooltips, exportação/importação local e layout de módulos imprimíveis são infraestrutura global em `src/assets/`. Ícones usam pacotes Font Awesome modulares e apenas as definições gratuitas efetivamente importadas entram no bundle.

Autoria, licença, disclaimer, isenção de responsabilidade e textos institucionais são fonte única do chrome global. O autor exibido é sempre JeanCarloEM, com link para `https://www.jeancarloem.com`.
