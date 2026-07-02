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

O build compila os artefatos públicos, gera os bundles offline `*.bundle.html` e prepara `_site` com arquivos otimizados para hospedagem.

O código-fonte canônico fica em `src/**/*.ts` e `src/**/*.tsx`. Os arquivos `.js` em diretórios públicos são artefatos compilados para manter compatibilidade com publicação estática.
