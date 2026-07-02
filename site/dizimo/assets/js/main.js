"use strict";
(() => {
  // src/dizimo/assets/js/main.ts
  (function bootstrapDizimo($, w) {
    "use strict";
    function isNum(value) {
      return value !== null && typeof value !== "undefined" && value !== "" && !Number.isNaN(Number(value)) && Number.isFinite(Number(value));
    }
    function setHtml(selector, value) {
      const element = document.querySelector(selector);
      if (element) {
        element.innerHTML = value;
      }
    }
    function brl(value) {
      return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
    }
    function normalizeCurrency(value) {
      const cleaned = value.replace(/[^\d,]/g, "").replace(/[,]/g, ".");
      if (cleaned.trim().length === 0) {
        return "";
      }
      const parsed = Number.parseFloat(cleaned);
      return Number.isNaN(parsed) ? "" : brl(parsed);
    }
    function calcular() {
      let total = 0;
      const recebimentos = $("input.recebimentos");
      for (let index = 0; index < recebimentos.length; index++) {
        const input = recebimentos[index];
        total += Number.parseFloat(input && isNum(input.value) ? input.value : "0");
      }
      setHtml("div.input.rc > i", brl(total));
      const ofertaInput = document.querySelector('input[name="of"]');
      const oferta = Number.parseFloat(isNum(ofertaInput?.value) ? ofertaInput?.value ?? "1" : "1") / 100 * total;
      setHtml("div.input.of > i", brl(oferta));
      const dizimo = total * 0.1;
      const correcaoInput = document.querySelector('input[name="cd"]');
      const correcao = Number.parseFloat(isNum(correcaoInput?.value) ? correcaoInput?.value ?? "7" : "7") / 100 * dizimo;
      setHtml("div.input.cd > i", brl(correcao));
      setHtml("div.input.dz > i", brl(dizimo));
      setHtml("div.input.dc > i", brl(dizimo + correcao));
      setHtml("div.input.tt > i", brl(dizimo + correcao + oferta));
    }
    w.isNum = isNum;
    w.onload = () => {
      const inputs = $("input");
      for (let index = 0; index < inputs.length; index++) {
        const input = inputs[index];
        if (!input) {
          continue;
        }
        input.addEventListener("keyup", calcular);
        input.addEventListener("focusout", calcular);
        input.addEventListener("blur", (event) => {
          const target = event.target;
          if (target instanceof HTMLInputElement && target.getAttribute("type") === "currency") {
            target.value = normalizeCurrency(target.value);
          }
        });
      }
    };
  })(window.Zepto, window);
})();
