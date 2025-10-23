window.addEventListener('DOMContentLoaded', function () {
  // Populando select de cifras
  let selectCifras = document.getElementById('cifras');
  bancoDeCifras.forEach((cifra, i) => {
    selectCifras.innerHTML += `<option value="${cifra.nome}" ${i === 0 ? "selected" : ""}>${cifra.nome}</option>`;
  });

  function trocarCifra(cifra) {
    let cifraSelecionada = bancoDeCifras.filter(
      (cifraDoBanco) => cifraDoBanco.nome === cifra
    )[0];
    appState.tom = cifraSelecionada.tom;
    appState.tomOriginal = cifraSelecionada.tom;
    appState.afinacao = cifraSelecionada.afinacao;
    appState.afinacaoOriginal = cifraSelecionada.afinacao;

    fetch(`examples/${cifra}.txt`)
      .then(response => response.text())
      .then(data => {
        appState.cifraOriginal = data;
        appState.linhas = checkCifraLines(data);
        document.getElementById('cifra_original').textContent = appState.cifraOriginal;
        document.getElementById('cifra').textContent = appState.cifraOriginal;
        appState.cifras = Cifra.extrairDaCifra(
          afinacoesPorApelido[appState.afinacaoOriginal],
          data
        );
        renderDependingOnWindowSize();
      });
  }

  window.addEventListener("resize", renderDependingOnWindowSize);

  // Populando select de afinações
  let selectAfinacao = document.getElementById('afinacao');
  afinacoes.forEach((afinacao) => {
    selectAfinacao.innerHTML += `<option value="${afinacao.apelido}" ${
      appState.afinacao === afinacao.apelido ? "selected" : ""
    }>${afinacao.nome}</option>`;
  });

  // Ao trocar campo select de cifras, popula os dados de cifras
  document.getElementById('cifras').addEventListener('change', (e) => trocarCifra(e.target.value));
  document.getElementById('cifras').dispatchEvent(new Event('change'));

  // Setando afinação inicial
  document.getElementById('afinacao').value = appState.afinacao;

  // Regulagem de tons, preenchendo tom principal
  document.getElementById('tom').value = appState.tom;
  // Alterando tom pelo botão de "Reduzir Meio Tom"
  document.getElementById('reduzir_meio_tom').addEventListener('click', () => {
    let novoTom = Object.entries(dicionarioTons).filter(
      (nota) => nota[1] === dicionarioTons[appState.tom] - 1
    );
    if (!novoTom.length) {
      novoTom = "B";
    } else {
      novoTom = novoTom[0][0];
    }
    appState.tom = novoTom;
    document.getElementById('tom').value = diegoHackChangeBemois(appState.tom);
    // Alterando tom e renderizando no corpo do elemento #cifra
    appState.cifras.forEach((cifra) => cifra.alterarTom());
    renderDependingOnWindowSize();
  });
  // Alterando tom pelo botão de "Aumentar Meio Tom"
  document.getElementById('aumentar_meio_tom').addEventListener('click', () => {
    let novoTom = Object.entries(dicionarioTons).filter(
      (nota) => nota[1] === dicionarioTons[appState.tom] + 1
    );
    if (!novoTom.length) {
      novoTom = "C";
    } else {
      novoTom = novoTom[0][0];
    }
    appState.tom = novoTom;
    document.getElementById('tom').value = diegoHackChangeBemois(appState.tom);
    // Alterando tom e renderizando no corpo do elemento #cifra
    appState.cifras.forEach((cifra) => cifra.alterarTom());
    renderDependingOnWindowSize();
  });
  // Alterando tom direto pela digitação
  document.getElementById('tom').addEventListener('change', (e) => {
    let novoTom = e.target.value;
    if (Object.keys(dicionarioNotas).includes(novoTom)) {
      novoTom = Object.entries(dicionarioTons).filter(
        (tom) => tom[1] === dicionarioNotas[novoTom]
      )[0][0];
    } else {
      novoTom = appState.tom;
    }
    appState.tom = novoTom;
    document.getElementById('tom').value = diegoHackChangeBemois(appState.tom);
    // Alterando tom e renderizando no corpo do elemento #cifra
    appState.cifras.forEach((cifra) => cifra.alterarTom());
    renderDependingOnWindowSize();
  });

  // Alterando afinação pelo select
  document.getElementById('afinacao').addEventListener('change', (e) => {
    appState.afinacao = e.target.value;
    renderDependingOnWindowSize();
  });
});
