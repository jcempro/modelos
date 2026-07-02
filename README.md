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

O build compila artefatos públicos legíveis para desenvolvimento, prepara `_dist` com arquivos otimizados e bundles offline `*.bundle.html`, e publica `_site` a partir de `_dist`.

O código-fonte canônico fica em `src/**/*.ts` e `src/**/*.tsx`. Os arquivos `.js` em diretórios públicos são artefatos compilados para manter compatibilidade com publicação estática.
