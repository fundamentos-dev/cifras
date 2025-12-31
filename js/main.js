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
  const decreaseLineHeightButton = document.getElementById("decrease_line_height");
  const increaseLineHeightButton = document.getElementById("increase_line_height");
  const prevSlideButton = document.getElementById("prev_slide");
  const nextSlideButton = document.getElementById("next_slide");
  const slideTitle = document.getElementById("slide_title");
  const slidePosition = document.getElementById("slide_position");
  const slideContent = document.getElementById("slide_content");
  const toggleOriginal = document.getElementById("toggle-original");
  const cifraOriginal = document.getElementById("cifra_original");

  // Search Elements
  const searchTrigger = document.getElementById("search-trigger");
  const searchOverlay = document.getElementById("search-overlay");
  const closeSearch = document.getElementById("close-search");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");

  // Fullscreen Elements
  const fullscreenTrigger = document.getElementById("fullscreen-trigger");
  const iconMaximize = document.getElementById("icon-maximize");
  const iconMinimize = document.getElementById("icon-minimize");

  // Cache for song content
  const songCache = {};
  let songsLoaded = false;

  // Default collapsed
  cifraOriginal.classList.add("collapsed-original");

  const BASE_SLIDE_FONT_SIZE = 3.5;

  bancoDeCifras.forEach((cifra, index) => {
    const option = document.createElement("option");
    option.value = cifra.nome;
    option.textContent = cifra.nome.replace(/_/g, " ");
    if (index === 0) {
      option.selected = true;
    }
    selectCifras.appendChild(option);
  });

  const parseSlidesFromText = (texto) => {
    const linhas = texto.split(/\r?\n/);
    const secoes = [];
    const sectionMap = {}; // Map title -> content (lines)
    let secaoAtual = null;

    const limparExtremidadesVazias = (lista) => {
      while (lista.length && !lista[0].trim().length) {
        lista.shift();
      }
      while (lista.length && !lista[lista.length - 1].trim().length) {
        lista.pop();
      }
    };

    const pushSecao = () => {
      if (!secaoAtual) {
        return;
      }
      limparExtremidadesVazias(secaoAtual.linhas);
      
      const tituloNormalizado = secaoAtual.titulo.toLowerCase();
      const possuiConteudo = secaoAtual.linhas.some((linha) => linha.trim().length);

      if (secaoAtual.titulo) {
          if (possuiConteudo) {
              // Save content for this title
              sectionMap[tituloNormalizado] = secaoAtual.linhas.slice();
              secoes.push({
                  titulo: secaoAtual.titulo,
                  linhas: secaoAtual.linhas.slice(),
              });
          } else {
              // Try to find previous content
              if (sectionMap[tituloNormalizado]) {
                  secoes.push({
                      titulo: secaoAtual.titulo,
                      linhas: sectionMap[tituloNormalizado].slice(),
                  });
              } else {
                 // Keep empty if no previous content found (unlikely but safe)
                 if (secaoAtual.titulo) {
                     secoes.push({
                        titulo: secaoAtual.titulo,
                        linhas: [], // Or maybe keep it empty
                     });
                 }
              }
          }
      } else if (possuiConteudo) {
          secoes.push({
              titulo: "",
              linhas: secaoAtual.linhas.slice(),
          });
      }
    };

    linhas.forEach((linha) => {
      const tituloMatch = linha.match(/^\s*\[(.+?)\]\s*$/);
      if (tituloMatch) {
        if (secaoAtual) {
          pushSecao();
        }
        secaoAtual = {
          titulo: tituloMatch[1].trim(),
          linhas: [],
        };
      } else {
        if (!secaoAtual) {
          secaoAtual = {
            titulo: "",
            linhas: [],
          };
        }
        if (Cifra.isLinhaCifra(linha)) {
          return;
        }
        const linhaTratada = linha.replace(/\s+$/, "");
        secaoAtual.linhas.push(linhaTratada);
      }
    });

    pushSecao();

    if (!secoes.length && texto.trim().length) {
      return buildSlides([{
          titulo: "Letra",
          linhas: linhas,
      }]);
    }

    return buildSlides(secoes);
  };

  const buildSlides = (sections) => {
      if (!appState.compactMode) {
          // Normal mode: 1 section = 1 slide (mostly)
          return sections;
      }

      // Compact Mode: Merge sections
      const slides = [];
      let currentSlide = { titulo: "", linhas: [] };
      // Heuristic limit for a "full" compact slide (2 cols ~ 36 lines)
      // Reverted to fixed limit which was more stable
      const MAX_LINES = 36; 

      sections.forEach((section, index) => {
          // Check if adding this section exceeds limit
          const newLinesCount = currentSlide.linhas.length + section.linhas.length + (currentSlide.linhas.length > 0 ? 2 : 0); // +2 for spacing/title

          if (currentSlide.linhas.length > 0 && newLinesCount > MAX_LINES) {
              slides.push(currentSlide);
              currentSlide = { titulo: "", linhas: [] };
          }

          if (currentSlide.linhas.length > 0) {
              currentSlide.linhas.push(""); // Spacer
          }
          
          if (section.titulo) {
             currentSlide.linhas.push(`[${section.titulo}]`);
          }
          currentSlide.linhas.push(...section.linhas);
          
          // Propagate main title if it's the very first slide
          if (slides.length === 0 && currentSlide.linhas.length === section.linhas.length + (section.titulo ? 1 : 0)) {
               currentSlide.titulo = section.titulo;
          }
      });

      if (currentSlide.linhas.length > 0) {
          slides.push(currentSlide);
      }

      return slides;
  };

  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const normalizeText = (text) => {
    return text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  };

  const preloadSongs = async () => {
    if (songsLoaded) return;
    const promises = bancoDeCifras.map(async (cifra) => {
      try {
        const response = await fetch(`examples/${cifra.nome}.txt`);
        const text = await response.text();
        songCache[cifra.nome] = text;
      } catch (error) {
        console.error(`Erro ao carregar ${cifra.nome}`, error);
      }
    });
    await Promise.all(promises);
    songsLoaded = true;
  };

  const performSearch = (query) => {
    if (!query) {
      renderSearchResults([]);
      return;
    }
    const normalizedQuery = normalizeText(query);
    
    // Score based matching: Title match > Content match
    const results = bancoDeCifras.map(cifra => {
      const normalizedTitle = normalizeText(cifra.nome.replace(/_/g, " "));
      const content = songCache[cifra.nome] || "";
      const normalizedContent = normalizeText(content);
      
      let score = 0;
      let snippet = "";

      if (normalizedTitle.includes(normalizedQuery)) {
        score += 10;
      }
      
      const contentIndex = normalizedContent.indexOf(normalizedQuery);
      if (contentIndex !== -1) {
        score += 5;
        // Extract snippet
        const start = Math.max(0, contentIndex - 20);
        const end = Math.min(content.length, contentIndex + query.length + 40);
        snippet = "..." + content.substring(start, end).replace(/\n/g, " ") + "...";
      }

      return {
        ...cifra,
        score,
        snippet
      };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

    renderSearchResults(results);
  };

  const renderSearchResults = (results) => {
    searchResults.innerHTML = "";
    if (results.length === 0) {
      if (searchInput.value.trim()) {
         searchResults.innerHTML = "<li style='padding:16px; color:#999'>Nenhum resultado encontrado.</li>";
      }
      return;
    }

    results.forEach(item => {
      const li = document.createElement("li");
      li.className = "search-result-item";
      li.innerHTML = `
        <span class="result-title">${item.nome.replace(/_/g, " ")}</span>
        ${item.snippet ? `<span class="result-snippet">${escapeHtml(item.snippet)}</span>` : ""}
      `;
      li.addEventListener("click", () => {
        trocarCifra(item.nome);
        appState.modo = "letra"; // Force presentation mode
        updateModeUI();
        closeSearchOverlay();
      });
      searchResults.appendChild(li);
    });
  };

  const openSearchOverlay = () => {
    searchOverlay.classList.remove("hidden");
    searchOverlay.setAttribute("aria-hidden", "false");
    searchInput.focus();
    preloadSongs().then(() => {
        if (searchInput.value) performSearch(searchInput.value);
    });
  };

  const closeSearchOverlay = () => {
    searchOverlay.classList.add("hidden");
    searchOverlay.setAttribute("aria-hidden", "true");
    searchInput.value = "";
    searchResults.innerHTML = "";
  };

  const updateModeUI = () => {
    const isModoCifra = appState.modo === "cifra";
    modoCifraButton.classList.toggle("active", isModoCifra);
    modoLetraButton.classList.toggle("active", !isModoCifra);
    cifraView.classList.toggle("hidden", !isModoCifra);
    letraView.classList.toggle("hidden", isModoCifra);
    toneControls.classList.toggle("hidden", !isModoCifra);
    letraControls.classList.toggle("hidden", isModoCifra);

    // Update Body Class for CSS overrides
    if (isModoCifra) {
      document.body.classList.remove("mode-letra");
      renderCifraView();
    } else {
      document.body.classList.add("mode-letra");
      renderSlide();
    }
  };

  const updateSlideStyles = () => {
    if (!slideContent) {
      return;
    }
    
    // Auto column logic
    let useTwoColumns = false;
    if (appState.columnLayout === "2") {
        useTwoColumns = true;
    } else if (appState.columnLayout === "auto") {
        // Simple heuristic: lines count > 20 or text length > 500
        const currentSlide = appState.slides[appState.currentSlideIndex];
        if (currentSlide) {
            const lines = currentSlide.linhas.length;
            const textLen = currentSlide.linhas.join("").length;
            if (lines > 16 || textLen > 500) {
                useTwoColumns = true;
            }
        }
    }

    slideContent.classList.toggle("two-columns", useTwoColumns);
    const computedSize = (BASE_SLIDE_FONT_SIZE * appState.fontScale).toFixed(2);
    document.documentElement.style.setProperty(
      "--slide-font-size",
      `${computedSize}rem`
    );
    document.documentElement.style.setProperty(
      "--slide-line-height",
      appState.lineHeight
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

    // Special handling for the first slide (Title Slide)
    if (appState.currentSlideIndex === 0 && !appState.compactMode) {
        slideContent.classList.add("title-slide");
    } else {
        slideContent.classList.remove("title-slide");
    }

    const linhas = slide.linhas.length ? slide.linhas : [""];
    const html = linhas
      .map((linha, index) => {
        if (!linha.trim().length) {
          return "<p class='empty-line'>&nbsp;</p>";
        }
        
        // Handle Compact Mode headers
        const headerMatch = linha.match(/^\\\[(.+)\]$/);
        if (headerMatch) {
            return `<h4 class="compact-header">${escapeHtml(headerMatch[1])}</h4>`;
        }

        // If it's the title slide and first line (Normal mode only)
        if (appState.currentSlideIndex === 0 && index === 0 && !appState.compactMode) {
             return `<h1 class="slide-main-title">${escapeHtml(linha)}</h1>`;
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

    // Update select if triggered from search
    selectCifras.value = nomeCifra;

    appState.tom = cifraSelecionada.tom;
    appState.tomOriginal = cifraSelecionada.tom;
    tomInput.value = appState.tom;

    // Use cached if available
    if (songCache[nomeCifra]) {
        processCifraData(songCache[nomeCifra]);
    } else {
        fetch(`examples/${nomeCifra}.txt`)
        .then((response) => response.text())
        .then((data) => {
            songCache[nomeCifra] = data; // Cache it
            processCifraData(data);
        });
    }
  };

  const processCifraData = (data) => {
    appState.cifraOriginal = data;
    appState.linhas = checkCifraLines(data);
    document.getElementById("cifra_original").textContent = appState.cifraOriginal;
    appState.cifras = Cifra.extrairDaCifra(data);
    appState.cifras.forEach((cifra) => cifra.alterarTom());
    renderCifraView();

    appState.slides = parseSlidesFromText(data);
    appState.currentSlideIndex = 0;
    
    // If we are already in letra mode, render slide immediately
    if (appState.modo === "letra") {
        renderSlide();
    }
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
    const novoValor = Math.min(2.5, Math.max(0.3, appState.fontScale + delta));
    if (novoValor !== appState.fontScale) {
      appState.fontScale = novoValor;
      updateSlideStyles();
    }
  };

  const ajustarLineHeight = (delta) => {
    const novoValor = Math.min(3.0, Math.max(1.0, appState.lineHeight + delta));
    if (novoValor !== appState.lineHeight) {
      appState.lineHeight = novoValor;
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

  toggleOriginal.addEventListener("click", () => {
    const isCollapsed = cifraOriginal.classList.toggle("collapsed-original");
    toggleOriginal.textContent = isCollapsed ? "Mostrar mais" : "Mostrar menos";
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
  
  decreaseLineHeightButton.addEventListener("click", () => {
    ajustarLineHeight(-0.1);
  });

  increaseLineHeightButton.addEventListener("click", () => {
    ajustarLineHeight(0.1);
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
    // Shortcuts work in Letra mode OR if search is not open
    if (searchOverlay.classList.contains("hidden")) {
        // Open search with '/' or Ctrl+K
        if (event.key === "/" || (event.ctrlKey && event.key === "k")) {
            event.preventDefault();
            openSearchOverlay();
            return;
        }

        if (appState.modo === "letra") {
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
        }
    } else {
        // Search mode shortcuts
        if (event.key === "Escape") {
            closeSearchOverlay();
        }
    }
  });

  // Search Listeners
    searchTrigger.addEventListener("click", openSearchOverlay);
    closeSearch.addEventListener("click", closeSearchOverlay);
    searchInput.addEventListener("input", (e) => {
        performSearch(e.target.value);
    });
  
    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    };
  
    const updateFullscreenIcon = () => {
      if (document.fullscreenElement) {
        iconMaximize.classList.add("hidden");
        iconMinimize.classList.remove("hidden");
      } else {
        iconMaximize.classList.remove("hidden");
        iconMinimize.classList.add("hidden");
      }
    };
  
    if (fullscreenTrigger) {
      fullscreenTrigger.addEventListener("click", toggleFullscreen);
    }
    
    document.addEventListener("fullscreenchange", updateFullscreenIcon);
  
    // New Listener for Compact Mode
  const compactModeToggle = document.getElementById("compact_mode");
  if (compactModeToggle) {
      compactModeToggle.addEventListener("change", (e) => {
          appState.compactMode = e.target.checked;
          // Re-parse/build slides from original data
          if (appState.cifraOriginal) {
              appState.slides = parseSlidesFromText(appState.cifraOriginal);
              appState.currentSlideIndex = 0;
              renderSlide();
          }
      });
  }

  // Initial load
  trocarCifra(selectCifras.value || bancoDeCifras[0].nome);
  // Preload in background
  setTimeout(preloadSongs, 1000);
});