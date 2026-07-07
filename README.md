# Modelos JeanCarloEM

Projeto estático para modelos e utilitários Web publicados em GitHub Pages.

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
```

`src/` é a única fonte canônica para TypeScript, TSX, HTML, CSS e RCFs específicos. `dist/` é a única saída gerada: raiz publicada, artefato de produção e local dos bundles offline `*.bundle.zip`.

Entradas explícitas de build, bookmarklets e arquivos raiz publicados ficam em `scripts/config.json`.

Toolbar, ícones, tooltips, exportação/importação local e layout de módulos imprimíveis são infraestrutura global em `src/assets/`. Ícones usam pacotes Font Awesome modulares e apenas as definições gratuitas efetivamente importadas entram no bundle.

Autoria, licença, disclaimer, isenção de responsabilidade e textos institucionais são fonte única do chrome global. O autor exibido é sempre JeanCarloEM, com link para `https://www.jeancarloem.com`.
