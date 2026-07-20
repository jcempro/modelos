# AGENTS.md

Este projeto segue o contrato funcional descrito em [RCF.md](RCF.md).

Ao alterar o sistema:

- Ao término, indicar um texto detalhado para commit, com até 512 caracteres, separando melhoria de fix quando aplicável.
- Preserve a arquitetura atual de páginas estáticas, com HTML, CSS e JavaScript executando diretamente no navegador.
- Trate `src/` como fonte canônica para código, HTML, CSS, estilos, RCFs específicos e demais arquivos-fonte. Arquivos em `dist/` são artefatos gerados, raiz publicada e saída de produção; não devem ser editados manualmente.
- Rode `npm run check` quando a mudança tocar TypeScript, build, documentos, validação, assets compartilhados ou workflows.
- Use o projeto `whatsapp` apenas como referência documental. Não importe regras de negócio, fluxos, arquivos, dependências ou decisões funcionais daquele projeto.
- Codificar de forma blindada prevendo potenciais bugs e falhas e os tratar preventivamente.
- Atualize o `RCF.md` apropriado sempre que uma regra funcional, requisito não funcional ou decisão arquitetural mudar.
- Mantenha fidelidade de impressão A4 como requisito funcional permanente para documentos imprimíveis.
- Separe claramente elementos de interface Web da área imprimível do documento.
- Não permita que responsividade Web altere medidas, margens, paginação ou posicionamento da área imprimível.
- Preserve compatibilidade de impressão por Ctrl+P ou comando equivalente do navegador e por botão dedicado de geração de PDF.
- Mantenha salvamento automático durante edição de documentos, sem exigir ação manual do usuário.
- Ao evoluir barra de ferramentas, trate-a como componente reutilizável, configurável e extensível por escopo global, categoria, tipo documental e documento.
- Não implemente ícones, tooltips, separadores, exportação/importação local, scroll, workspace, preview, fundo externo ou aparência estrutural de formulários dentro de módulos; essas responsabilidades pertencem à infraestrutura global.
- Não duplique autoria, links institucionais, licença, disclaimer, isenção de responsabilidade ou textos de footer/cabeçalho em módulos; use a fonte institucional global e exiba o autor como JeanCarloEM com link.
- Use Font Awesome somente por pacotes NPM modulares e imports dos ícones gratuitos efetivamente usados; não carregue a biblioteca completa nem substitua ícones por Unicode/emoji.
- Preserve preenchimento integral de documentos por JSON recebido na query string em Base64, lembrando que Base64 é ofuscação, não segurança.
- Separe regras globais no [RCF.md](RCF.md) raiz e regras específicas no `RCF.md` do documento ou módulo correspondente dentro de `src/`.
- Valide visualmente mudanças que afetem impressão, margens, paginação, campos editáveis, timbre, toolbar ou geração de PDF.
- Não altere arquivos reais do usuário, histórico git ou arquivos fora do escopo solicitado sem autorização explícita.
- Inspecionar continuamente a raiz para extrair demandas pendentes do `TODO.md` em etapas atômicas para FT/etapas; editar `TODO.md`, para indicar FT/etapa vinculada; e consolidar a remoção via commit isolado no Git para rastreabilidade exclusiva; não implementar solicitações solicitadas sem solicitação explicita; as FTs e etapas DEVEM ter tarefa finais, que ao concluir, que remova o conteúdo análogo de `TODO.md`, garantido limpeza contínua de `TODO.md`.
