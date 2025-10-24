window.addEventListener("DOMContentLoaded", () => {
  const selectCifras = document.getElementById("cifras");
  const tomInput = document.getElementById("tom");
  const cifraView = document.getElementById("cifra_view");
  const letraView = document.getElementById("letra_view");
  const toneControls = document.getElementById("tone_controls");
  const letraControls = document.getElementById("letra_controls");
  const modoCifraButton = document.getElementById("modo_cifra");
  const modoLetraButton = document.getElementById("modo_letra");
  const panelToggle = document.getElementById("panel-toggle");
  const controlPanel = document.getElementById("control-panel");
  const columnSelect = document.getElementById("column_layout");
  const fontSizeValue = document.getElementById("font_size_value");
  const decreaseFontButton = document.getElementById("decrease_font");
  const increaseFontButton = document.getElementById("increase_font");
  const prevSlideButton = document.getElementById("prev_slide");
  const nextSlideButton = document.getElementById("next_slide");
  const slideTitle = document.getElementById("slide_title");
  const slidePosition = document.getElementById("slide_position");
  const slideContent = document.getElementById("slide_content");

  const BASE_SLIDE_FONT_SIZE = 1.4;

  bancoDeCifras.forEach((cifra, index) => {
    const option = document.createElement("option");
    option.value = cifra.nome;
    option.textContent = cifra.nome;
    if (index === 0) {
      option.selected = true;
    }
    selectCifras.appendChild(option);
  });

  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const updateModeUI = () => {
    const isModoCifra = appState.modo === "cifra";
    modoCifraButton.classList.toggle("active", isModoCifra);
    modoLetraButton.classList.toggle("active", !isModoCifra);
    cifraView.classList.toggle("hidden", !isModoCifra);
    letraView.classList.toggle("hidden", isModoCifra);
    toneControls.classList.toggle("hidden", !isModoCifra);
    letraControls.classList.toggle("hidden", isModoCifra);

    if (isModoCifra) {
      renderCifraView();
    } else {
      renderSlide();
    }
  };

  const updateSlideStyles = () => {
    if (!slideContent) {
      return;
    }
    slideContent.classList.toggle("two-columns", appState.columnLayout === "2");
    const computedSize = (BASE_SLIDE_FONT_SIZE * appState.fontScale).toFixed(2);
    document.documentElement.style.setProperty(
      "--slide-font-size",
      `${computedSize}rem`
    );
    fontSizeValue.textContent = `${Math.round(appState.fontScale * 100)}%`;
  };

  const updateSlideNavigationState = () => {
    const hasSlides = appState.slides.length > 0;
    prevSlideButton.disabled = !hasSlides || appState.currentSlideIndex === 0;
    nextSlideButton.disabled =
      !hasSlides || appState.currentSlideIndex >= appState.slides.length - 1;
  };

  const renderSlide = () => {
    slideContent.innerHTML = "";
    if (!appState.slides.length) {
      slideTitle.textContent = "Sem letra";
      slidePosition.textContent = "";
      slideContent.innerHTML = "<p>Nenhum conteúdo disponível.</p>";
      updateSlideStyles();
      updateSlideNavigationState();
      return;
    }

    const slide = appState.slides[appState.currentSlideIndex];
    const titulo = slide.titulo ? slide.titulo : `Seção ${appState.currentSlideIndex + 1}`;
    slideTitle.textContent = titulo;
    slidePosition.textContent = `${appState.currentSlideIndex + 1} / ${appState.slides.length}`;

    const linhas = slide.linhas.length ? slide.linhas : [""];
    const html = linhas
      .map((linha) => {
        if (!linha.trim().length) {
          return "<p class='empty-line'>&nbsp;</p>";
        }
        return `<p>${escapeHtml(linha)}</p>`;
      })
      .join("");

    slideContent.innerHTML = html;
    updateSlideStyles();
    updateSlideNavigationState();
  };

  const trocarCifra = (nomeCifra) => {
    const cifraSelecionada = bancoDeCifras.find((item) => item.nome === nomeCifra);
    if (!cifraSelecionada) {
      return;
    }

    appState.tom = cifraSelecionada.tom;
    appState.tomOriginal = cifraSelecionada.tom;
    tomInput.value = appState.tom;

    fetch(`examples/${nomeCifra}.txt`)
      .then((response) => response.text())
      .then((data) => {
        appState.cifraOriginal = data;
        appState.linhas = checkCifraLines(data);
        document.getElementById("cifra_original").textContent = appState.cifraOriginal;
        appState.cifras = Cifra.extrairDaCifra(data);
        appState.cifras.forEach((cifra) => cifra.alterarTom());
        renderCifraView();

        appState.slides = parseSlidesFromText(data);
        appState.currentSlideIndex = 0;
        renderSlide();
        updateModeUI();
      });
  };

  const alterarTom = (variacao) => {
    let novoTomEntry = Object.entries(dicionarioTons).find(
      (nota) => nota[1] === dicionarioTons[appState.tom] + variacao
    );
    if (!novoTomEntry) {
      if (variacao > 0) {
        novoTomEntry = ["C", dicionarioTons["C"]];
      } else {
        novoTomEntry = ["B", dicionarioTons["B"]];
      }
    }
    appState.tom = novoTomEntry[0];
    tomInput.value = appState.tom;
    appState.cifras.forEach((cifra) => cifra.alterarTom());
    if (appState.modo === "cifra") {
      renderCifraView();
    }
  };

  const ajustarEscalaFonte = (delta) => {
    const novoValor = Math.min(2.5, Math.max(0.6, appState.fontScale + delta));
    if (novoValor !== appState.fontScale) {
      appState.fontScale = novoValor;
      updateSlideStyles();
    }
  };

  window.addEventListener("resize", () => {
    if (appState.modo === "cifra") {
      renderCifraView();
    }
  });

  panelToggle.addEventListener("click", () => {
    controlPanel.classList.toggle("collapsed");
    const isCollapsed = controlPanel.classList.contains("collapsed");
    panelToggle.textContent = isCollapsed ? "Mostrar controles" : "Ocultar controles";
    panelToggle.setAttribute("aria-expanded", (!isCollapsed).toString());
  });

  modoCifraButton.addEventListener("click", () => {
    appState.modo = "cifra";
    updateModeUI();
  });

  modoLetraButton.addEventListener("click", () => {
    appState.modo = "letra";
    updateModeUI();
  });

  document.getElementById("reduzir_meio_tom").addEventListener("click", () => {
    alterarTom(-1);
  });

  document.getElementById("aumentar_meio_tom").addEventListener("click", () => {
    alterarTom(1);
  });

  tomInput.addEventListener("change", (event) => {
    let novoTom = event.target.value.trim();
    if (Object.prototype.hasOwnProperty.call(dicionarioNotas, novoTom)) {
      novoTom = Object.entries(dicionarioTons).filter(
        (tom) => tom[1] === dicionarioNotas[novoTom]
      )[0][0];
    } else if (!Object.prototype.hasOwnProperty.call(dicionarioTons, novoTom)) {
      novoTom = appState.tom;
    }
    appState.tom = novoTom;
    tomInput.value = appState.tom;
    appState.cifras.forEach((cifra) => cifra.alterarTom());
    if (appState.modo === "cifra") {
      renderCifraView();
    }
  });

  selectCifras.addEventListener("change", (event) => {
    trocarCifra(event.target.value);
  });

  columnSelect.addEventListener("change", (event) => {
    appState.columnLayout = event.target.value;
    updateSlideStyles();
  });

  decreaseFontButton.addEventListener("click", () => {
    ajustarEscalaFonte(-0.1);
  });

  increaseFontButton.addEventListener("click", () => {
    ajustarEscalaFonte(0.1);
  });

  prevSlideButton.addEventListener("click", () => {
    if (appState.currentSlideIndex > 0) {
      appState.currentSlideIndex -= 1;
      renderSlide();
    }
  });

  nextSlideButton.addEventListener("click", () => {
    if (appState.currentSlideIndex < appState.slides.length - 1) {
      appState.currentSlideIndex += 1;
      renderSlide();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (appState.modo !== "letra") {
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (appState.currentSlideIndex < appState.slides.length - 1) {
        appState.currentSlideIndex += 1;
        renderSlide();
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (appState.currentSlideIndex > 0) {
        appState.currentSlideIndex -= 1;
        renderSlide();
      }
    }
  });

  trocarCifra(selectCifras.value || bancoDeCifras[0].nome);
});
