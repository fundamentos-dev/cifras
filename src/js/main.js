$(document).ready(function () {
  // Populando select de cifras
  bancoDeCifras.forEach((cifra, i) => {
    $("select#cifras").append(
      `<option value="${cifra.nome}" ${i === 0 ? "selected" : ""}>${
        cifra.nome
      }</option>`
    );
  });

  function trocarCifra(cifra) {
    let cifraSelecionada = bancoDeCifras.filter(
      (cifraDoBanco) => cifraDoBanco.nome === cifra
    )[0];
    appState.tom = cifraSelecionada.tom;
    appState.tomOriginal = cifraSelecionada.tom;
    appState.afinacao = cifraSelecionada.afinacao;
    appState.afinacaoOriginal = cifraSelecionada.afinacao;

    $.ajax({
      url: `examples/${cifra}.txt`,
      dataType: "text",
      success: function (data) {
        appState.cifraOriginal = data;
        appState.linhas = checkCifraLines(data);
        $("#cifra_original").text(appState.cifraOriginal);
        $("#cifra").text(appState.cifraOriginal);
        appState.tablaturas = Tablatura.extrairDaCifra(
          afinacoesPorApelido[appState.afinacaoOriginal],
          data
        );
        appState.cifras = Cifra.extrairDaCifra(
          afinacoesPorApelido[appState.afinacaoOriginal],
          data
        );
        renderDependingOnWindowSize();
      },
    });
  }

  window.addEventListener("resize", renderDependingOnWindowSize);

  // Populando select de afinações
  afinacoes.forEach((afinacao) => {
    $("select#afinacao").append(
      `<option value="${afinacao.apelido}" ${
        appState.afinacao === afinacao.apelido ? "selected" : ""
      }>${afinacao.nome}</option>`
    );
  });

  // Ao trocar campo select de cifras, popula os dados de cifras
  $("#cifras").change((e) => trocarCifra(e.target.value));
  $("#cifras").change();

  // Setando afinação inicial
  $("select#afinacao").val(appState.afinacao);

  // Regulagem de tons, preenchendo tom principal
  $("input#tom").val(appState.tom);
  // Alterando tom pelo botão de "Reduzir Meio Tom"
  $("button#reduzir_meio_tom").click(() => {
    let novoTom = Object.entries(dicionarioTons).filter(
      (nota) => nota[1] === dicionarioTons[appState.tom] - 1
    );
    if (!novoTom.length) {
      novoTom = "B";
    } else {
      novoTom = novoTom[0][0];
    }
    appState.tom = novoTom;
    $("input#tom").val(diegoHackChangeBemois(appState.tom));
    // Alterando tom e renderizando no corpo do elemento #cifra
    appState.tablaturas.forEach((tablatura) => tablatura.alterarTom());
    appState.cifras.forEach((cifra) => cifra.alterarTom());
    renderDependingOnWindowSize();
  });
  // Alterando tom pelo botão de "Aumentar Meio Tom"
  $("button#aumentar_meio_tom").click(() => {
    let novoTom = Object.entries(dicionarioTons).filter(
      (nota) => nota[1] === dicionarioTons[appState.tom] + 1
    );
    if (!novoTom.length) {
      novoTom = "C";
    } else {
      novoTom = novoTom[0][0];
    }
    appState.tom = novoTom;
    $("input#tom").val(diegoHackChangeBemois(appState.tom));
    // Alterando tom e renderizando no corpo do elemento #cifra
    appState.tablaturas.forEach((tablatura) => tablatura.alterarTom());
    appState.cifras.forEach((cifra) => cifra.alterarTom());
    renderDependingOnWindowSize();
  });
  // Alterando tom direto pela digitação
  $("input#tom").change((e) => {
    let novoTom = e.target.value;
    if (Object.keys(dicionarioNotas).includes(novoTom)) {
      novoTom = Object.entries(dicionarioTons).filter(
        (tom) => tom[1] === dicionarioNotas[novoTom]
      )[0][0];
    } else {
      novoTom = appState.tom;
    }
    appState.tom = novoTom;
    $("input#tom").val(diegoHackChangeBemois(appState.tom));
    // Alterando tom e renderizando no corpo do elemento #cifra
    appState.tablaturas.forEach((tablatura) => tablatura.alterarTom());
    appState.cifras.forEach((cifra) => cifra.alterarTom());
    renderDependingOnWindowSize();
  });

  // Alterando afinação pelo select
  $("#afinacao").change((e) => {
    appState.afinacao = e.target.value;
    appState.tablaturas.forEach((tablatura) =>
      tablatura.alterarAfinacao(e.target.value)
    );
    renderDependingOnWindowSize();
  });

  $("#assinatura").change(function () {
    appState.premium = $(this).prop("checked")
  });
});
