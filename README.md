# Modelos JCEM

Projeto estático para modelos e utilitários Web publicados em GitHub Pages.

## Desenvolvimento

```bash
npm install
npm run dev
```

Para desenvolvimento com recarregamento automático:

```bash
npm run dev-live
```

## Validação

```bash
npm run check
```

## Build

```bash
npm run build
```

O build materializa o cache publicável em `site/` a partir de `src/`, incluindo os bundles offline `*.bundle.zip`, e prepara `dist/` como saída local otimizada para validação.

O código-fonte canônico fica em `src/`, incluindo TypeScript, TSX, HTML, CSS e RCFs específicos. `site/` é cache de construção e raiz publicada pelo GitHub Pages; `dist/` é saída local ignorada pelo Git.
