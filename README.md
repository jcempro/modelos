# Modelos JCEM

Projeto estático para modelos e utilitários Web publicados em GitHub Pages.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Validação

```bash
npm run check
```

## Build

```bash
npm run build
```

O build compila artefatos públicos legíveis em `site/` para desenvolvimento e prepara `dist/` com arquivos otimizados e bundles offline `*.bundle.html`.

O código-fonte canônico fica em `src/**/*.ts` e `src/**/*.tsx`. A árvore estática de trabalho fica em `site/`, e `dist/` é a saída de produção.
