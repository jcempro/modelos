(function bootstrapAdmissional(w: Window): void {
  "use strict";

  const doc = w.JCEMDocumentos;
  if (!doc) {
    w.alert("Infraestrutura documental indisponivel.");
    return;
  }
  const api: JCEMDocumentosApi = doc;

  const pageConfig: PageConfig = {
    bottom: 1.5,
    left: 1.4,
    right: 0.5,
    size: [21, 29.7],
    top: 1,
    unit: "cm"
  };

  const phoneTitle = "TELEFONE da empresa INVALIDO!";
  const validation: ValidationConfig = {
    emptyFieldMessage: "Campo '${0}' vazio ou invalido",
    fieldRules: [
      { hint: "Nome", pattern: "\\w(\\w{2,20} ){1,20}\\w{2,20}", required: true, selector: 'input[name="nome"]' },
      { hint: "CPF", required: true, selector: "#cpf", validator: "cpf" },
      { hint: "e-mail", pattern: "[\\w\\d\\.\\-_]@[\\w\\d\\-_]{3,64}(\\.[\\w\\d\\-_]{2,64})+", required: false, selector: 'input[hint="e-mail"]' },
      { hint: "Celular", required: true, selector: 'input[hint="Celular"]', validator: "celular" },
      { hint: "Recado", required: false, selector: 'input[hint="Recado"]', validator: "celular" },
      { hint: "Logradouro", required: true, selector: 'input[hint="Logradouro"]' },
      { hint: "Bairro", required: true, selector: 'input[hint="Bairro"]' },
      { hint: "Município", required: true, selector: 'input[hint="Município"]' },
      { hint: "UF", pattern: "^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$", required: true, selector: 'input[hint="UF"]' },
      { hint: "CEP", required: true, selector: "#cep", validator: "cep" },
      { hint: "Cargo/Função", required: true, selector: 'input[hint="Cargo/Função"]' },
      { hint: "Salário", required: true, selector: 'input[hint="Salário"]', validator: "moeda" },
      { message: "Nome da empresa invalido!", pattern: "\\w{1,20}(\\ \\w{1,20})", required: true, selector: "#nome", uppercase: true },
      { message: "CNPJ da empresa invalido", required: true, selector: "#cnpj", validator: "cnpj" },
      { message: `${phoneTitle}\n\n\t- Deve conter 10 digitos\n\t- Um DDD valido`, required: true, selector: "#fone", validator: "telefone" }
    ],
    messages: {
      cnpj: "CNPJ da empresa invalido",
      fone: `${phoneTitle}\n\n\t- Deve conter 10 digitos\n\t- Um DDD valido`,
      nome: "Nome da empresa invalido!"
    }
  };

  function filename(): string {
    const input = api.one<HTMLInputElement>("input[name=nome]");
    return `${input?.value ? input.value : "Modelo Carta Admissional"}.pdf`;
  }

  function validateAll(): boolean {
    return api.validate.all({ validation });
  }

  function validateCompany(): boolean {
    return api.validate.all({ onlyAttribute: "empresa", validation });
  }

  function printPdf(): void {
    if (!validateAll()) {
      return;
    }

    api.print.pdf({ filename, pageConfig });
  }

  function printBlankPdf(): void {
    if (!validateCompany()) {
      return;
    }

    api.autosave.clearAutoFields({ removeStorage: false });
    api.print.pdf({ filename, pageConfig });
  }

  function fieldValue(selector: string): string {
    return api.one<HTMLInputElement>(selector)?.value ?? "";
  }

  function sharePayload(): Record<string, unknown> {
    return {
      bairro: fieldValue('input[hint="Bairro"]'),
      cargo: fieldValue('input[hint="Cargo/Função"]'),
      celular: fieldValue('input[hint="Celular"]'),
      cep: fieldValue("#cep"),
      cnpj: fieldValue("#cnpj"),
      cpf: fieldValue("#cpf"),
      email: fieldValue('input[hint="e-mail"]'),
      empresa: fieldValue("#nome"),
      logradouro: fieldValue('input[hint="Logradouro"]'),
      municipio: fieldValue('input[hint="Município"]'),
      pessoaNome: fieldValue('input[name="nome"]'),
      recado: fieldValue('input[hint="Recado"]'),
      salario: fieldValue('input[hint="Salário"]'),
      telefone: fieldValue("#fone"),
      timbre: api.storage.getItem("timbre") || "",
      uf: fieldValue('input[hint="UF"]')
    };
  }

  function applyParams(): void {
    api.query.apply({
      fields: [
        { jsonKeys: ["pessoaNome", "funcionarioNome", "nomePessoa"], selector: 'input[name="nome"]' },
        { jsonKeys: ["cpf", "pessoaCpf", "funcionarioCpf"], selector: "#cpf" },
        { jsonKeys: ["email", "pessoaEmail"], selector: 'input[hint="e-mail"]' },
        { jsonKeys: ["celular", "pessoaCelular"], selector: 'input[hint="Celular"]' },
        { jsonKeys: ["recado", "telefoneRecado"], selector: 'input[hint="Recado"]' },
        { jsonKeys: ["logradouro", "endereco"], selector: 'input[hint="Logradouro"]' },
        { jsonKeys: ["bairro"], selector: 'input[hint="Bairro"]' },
        { jsonKeys: ["municipio", "cidade"], selector: 'input[hint="Município"]' },
        { jsonKeys: ["uf", "estado"], selector: 'input[hint="UF"]' },
        { jsonKeys: ["cep"], selector: "#cep" },
        { jsonKeys: ["cargo", "funcao", "cargoFuncao"], selector: 'input[hint="Cargo/Função"]' },
        { jsonKeys: ["salario", "renda"], selector: 'input[hint="Salário"]' },
        { jsonKeys: ["empresa", "nomeEmpresa", "razaoSocial"], params: ["empresa", "nome"], selector: "#nome" },
        { jsonKeys: ["cnpj"], params: "cnpj", sanitizeRegex: /[^\d]/g, selector: "#cnpj" },
        { jsonKeys: ["tel", "fone", "telefone"], params: ["tel", "fone", "telefone"], sanitizeRegex: /[^\d]/g, selector: "#fone" }
      ],
      storageMappings: [
        {
          afterSet: () => {
            w.setTimeout(() => api.image.load({ key: "timbre", selector: "img.logo" }), 100);
          },
          jsonKeys: ["timbre", "logo"],
          key: "timbre",
          params: ["timbre", "logo"]
        }
      ]
    });
  }

  api.ready(() => {
    api.chrome.render({ actionsSelector: "[data-jcem-actions]", mountBefore: ".versao" });
    api.autosave.indicator(".autosave");
    api.image.load({ key: "timbre", selector: "img.logo" });
    api.print.createPageStyle(pageConfig);
    api.autosave.init({ validation });
    api.date.current("span.data");
    api.image.bindUpload({ inputSelector: "input[type=file]", key: "timbre", selector: "img.logo" });

    api.toolbar.bind({
      ".menu .clear": () => api.autosave.clearAutoFields(),
      ".menu .pdf.formulario": printBlankPdf,
      ".menu .pdf.print": printPdf
    });

    api.share.bindToolbar(".menu .share", {
      beforeShare: (context) => context.mode === "clean" || validateCompany(),
      messages: {
        copiedClean: "Endereco limpo do modelo copiado para a area de transferencia.",
        copiedFilled: "Endereco do modelo preenchido copiado para a area de transferencia."
      },
      payload: sharePayload
    });

    applyParams();
  });
})(window);
