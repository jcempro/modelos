"use strict";
(() => {
  // src/oficios/admissional/admissional.ts
  (function bootstrapAdmissional(w) {
    "use strict";
    const doc = w.JCEMDocumentos;
    if (!doc) {
      w.alert("Infraestrutura documental indisponivel.");
      return;
    }
    const api = doc;
    const pageConfig = {
      bottom: 1.5,
      left: 1.4,
      right: 0.5,
      size: [21, 29.7],
      top: 1,
      unit: "cm"
    };
    const phoneTitle = "TELEFONE da empresa INVALIDO!";
    const validation = {
      emptyFieldMessage: "Campo '${0}' vazio ou invalido",
      fieldRules: [
        { hint: "Nome", pattern: "\\w(\\w{2,20} ){1,20}\\w{2,20}", required: true, selector: 'input[name="nome"]' },
        { hint: "CPF", required: true, selector: "#cpf", validator: "cpf" },
        { hint: "e-mail", pattern: "[\\w\\d\\.\\-_]@[\\w\\d\\-_]{3,64}(\\.[\\w\\d\\-_]{2,64})+", required: false, selector: 'input[hint="e-mail"]' },
        { hint: "Celular", required: true, selector: 'input[hint="Celular"]', validator: "celular" },
        { hint: "Recado", required: false, selector: 'input[hint="Recado"]', validator: "celular" },
        { hint: "Logradouro", required: true, selector: 'input[hint="Logradouro"]' },
        { hint: "Bairro", required: true, selector: 'input[hint="Bairro"]' },
        { hint: "Munic\xEDpio", required: true, selector: 'input[hint="Munic\xEDpio"]' },
        { hint: "UF", pattern: "^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$", required: true, selector: 'input[hint="UF"]' },
        { hint: "CEP", required: true, selector: "#cep", validator: "cep" },
        { hint: "Cargo/Fun\xE7\xE3o", required: true, selector: 'input[hint="Cargo/Fun\xE7\xE3o"]' },
        { hint: "Sal\xE1rio", required: true, selector: 'input[hint="Sal\xE1rio"]', validator: "moeda" },
        { message: "Nome da empresa invalido!", pattern: "\\w{1,20}(\\ \\w{1,20})", required: true, selector: "#nome", uppercase: true },
        { message: "CNPJ da empresa invalido", required: true, selector: "#cnpj", validator: "cnpj" },
        { message: `${phoneTitle}

	- Deve conter 10 digitos
	- Um DDD valido`, required: true, selector: "#fone", validator: "telefone" }
      ],
      messages: {
        cnpj: "CNPJ da empresa invalido",
        fone: `${phoneTitle}

	- Deve conter 10 digitos
	- Um DDD valido`,
        nome: "Nome da empresa invalido!"
      }
    };
    function filename() {
      const input = api.one("input[name=nome]");
      return `${input?.value ? input.value : "Modelo Carta Admissional"}.pdf`;
    }
    function validateAll() {
      return api.validate.all({ validation });
    }
    function validateCompany() {
      return api.validate.all({ onlyAttribute: "empresa", validation });
    }
    function printPdf() {
      if (!validateAll()) {
        return;
      }
      api.print.pdf({ filename, pageConfig });
    }
    function printBlankPdf() {
      if (!validateCompany()) {
        return;
      }
      api.autosave.clearAutoFields({ removeStorage: false });
      api.print.pdf({ filename, pageConfig });
    }
    function requireField(selector) {
      const field = api.one(selector);
      if (!field) {
        w.alert(`Campo nao encontrado: ${selector}`);
        return null;
      }
      return field;
    }
    function sharePrefilled() {
      if (!validateCompany()) {
        return;
      }
      const phone = requireField("#fone");
      const cnpj = requireField("#cnpj");
      const company = requireField("#nome");
      if (!phone || !cnpj || !company) {
        return;
      }
      const timbre = api.storage.getItem("timbre") || "";
      const url = "https://modelos.jcem.pro/oficios/admissional/index.html";
      let query = `?tel=${api.base64.encode(api.util.digits(phone.value))}`;
      query += `&cnpj=${api.base64.encode(api.util.digits(cnpj.value))}`;
      query += `&empresa=${api.base64.encode(company.value)}`;
      query += `&timbre=${api.base64.encode(timbre)}`;
      void api.clipboard.copy(url + query).then(() => {
        w.alert("Endereco do modelo pre preenchido copiado para a area de transferencia.");
      });
    }
    function applyParams() {
      api.query.apply({
        fields: [
          { jsonKeys: ["pessoaNome", "funcionarioNome", "nomePessoa"], selector: 'input[name="nome"]' },
          { jsonKeys: ["cpf", "pessoaCpf", "funcionarioCpf"], selector: "#cpf" },
          { jsonKeys: ["email", "pessoaEmail"], selector: 'input[hint="e-mail"]' },
          { jsonKeys: ["celular", "pessoaCelular"], selector: 'input[hint="Celular"]' },
          { jsonKeys: ["recado", "telefoneRecado"], selector: 'input[hint="Recado"]' },
          { jsonKeys: ["logradouro", "endereco"], selector: 'input[hint="Logradouro"]' },
          { jsonKeys: ["bairro"], selector: 'input[hint="Bairro"]' },
          { jsonKeys: ["municipio", "cidade"], selector: 'input[hint="Munic\xEDpio"]' },
          { jsonKeys: ["uf", "estado"], selector: 'input[hint="UF"]' },
          { jsonKeys: ["cep"], selector: "#cep" },
          { jsonKeys: ["cargo", "funcao", "cargoFuncao"], selector: 'input[hint="Cargo/Fun\xE7\xE3o"]' },
          { jsonKeys: ["salario", "renda"], selector: 'input[hint="Sal\xE1rio"]' },
          { jsonKeys: ["empresa", "nomeEmpresa", "razaoSocial"], params: ["empresa", "nome"], selector: "#nome" },
          { jsonKeys: ["cnpj"], params: "cnpj", sanitizeRegex: /[^\d]/g, selector: "#cnpj" },
          { jsonKeys: ["tel", "fone", "telefone"], params: ["tel", "fone", "telefone"], sanitizeRegex: /[^\d]/g, selector: "#fone" }
        ],
        storageMappings: [
          {
            afterSet: () => {
              w.setTimeout(() => api.image.load({ key: "timbre", selector: "img.logo" }), 100);
            },
            key: "timbre",
            params: ["timbre", "logo"]
          }
        ]
      });
    }
    api.ready(() => {
      api.autosave.indicator(".autosave");
      api.image.load({ key: "timbre", selector: "img.logo" });
      api.print.createPageStyle(pageConfig);
      api.autosave.init({ validation });
      api.date.current("span.data");
      api.image.bindUpload({ inputSelector: "input[type=file]", key: "timbre", selector: "img.logo" });
      api.toolbar.bind({
        ".menu .clear": () => api.autosave.clearAutoFields(),
        ".menu .pdf.formulario": printBlankPdf,
        ".menu .pdf.print": printPdf,
        ".menu .share": sharePrefilled
      });
      applyParams();
    });
  })(window);
})();
