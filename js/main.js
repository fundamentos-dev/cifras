window.addEventListener("DOMContentLoaded", () => {
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
  const themeToggle = document.getElementById("theme_toggle");
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
  const songMetaCache = {};
  let songsLoaded = false;
  let songsListingPromise = null;

  // Default collapsed
  cifraOriginal.classList.add("collapsed-original");
  document.body.classList.toggle("mode-cifra", appState.modo === "cifra");

  const BASE_SLIDE_FONT_SIZE = 3.5;
  const BASE_CIFRA_FONT_SIZE = 1.0;
  const DEFAULT_SLIDE_FONT_SCALE = appState.fontScale;
  const DEFAULT_SLIDE_LINE_HEIGHT = appState.lineHeight;
  const COMPACT_FIT_LIMITS = {
    minLineHeightRatio: 1.08,
    lineHeightStep: 0.02,
    minFontSizePx: 14,
    fontSizeStep: 0.5,
    maxIterations: 200,
    overflowTolerancePx: 1,
  };
  const THEME_STORAGE_KEY = "cifras-theme";
  const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  let compactFitFrameId = null;
  let compactPaginationInProgress = false;
  let searchSelectionIndex = -1;
  let lastSearchResults = [];

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

  const TOM_METADATA_REGEX = /^\s*Tom:\s*([A-G](?:#|b)?)\s*$/i;

  const normalizeTom = (rawTom) => {
    if (!rawTom) {
      return null;
    }
    const trimmed = rawTom.trim();
    if (!trimmed.length) {
      return null;
    }
    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    return dicionarioTons[normalized] ? normalized : null;
  };

  /**
   * Extrai o metadado "Tom: X" logo apos o titulo e remove essa linha do texto.
   * @param {string} rawText
   * @returns {{tom: (string|null), text: string}}
   */
  const parseSongMetadata = (rawText) => {
    const lines = rawText.split(/\r?\n/);
    let titleIndex = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].trim().length) {
        titleIndex = i;
        break;
      }
    }

    let tom = null;
    let metadataIndex = -1;
    if (titleIndex !== -1) {
      for (let i = titleIndex + 1; i < lines.length; i += 1) {
        const trimmed = lines[i].trim();
        if (!trimmed.length) {
          continue;
        }
        const match = trimmed.match(TOM_METADATA_REGEX);
        if (match) {
          tom = normalizeTom(match[1]);
          metadataIndex = i;
        }
        break;
      }
    }

    if (metadataIndex !== -1) {
      lines.splice(metadataIndex, 1);
    }

    return {
      tom,
      text: lines.join("\n"),
    };
  };

  const storeSongContent = (nome, rawText) => {
    const { tom, text } = parseSongMetadata(rawText);
    songCache[nome] = text;
    if (tom) {
      songMetaCache[nome] = tom;
    }
    return { tom, text };
  };

  const extractSongNamesFromHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc.querySelectorAll("a"));
    const names = new Set();

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) {
        return;
      }
      const cleaned = href.split("?")[0].split("#")[0];
      if (!cleaned.toLowerCase().endsWith(".txt")) {
        return;
      }
      const baseName = cleaned.split("/").pop();
      if (!baseName) {
        return;
      }
      let decoded = baseName;
      try {
        decoded = decodeURIComponent(baseName);
      } catch (error) {
        decoded = baseName;
      }
      const name = decoded.replace(/\.txt$/i, "");
      if (name) {
        names.add(name);
      }
    });

    return Array.from(names).sort();
  };

  const fetchSongList = async () => {
    try {
      // 1. Tenta carregar a lista gerada pelo Jekyll (GitHub Pages)
      const response = await fetch(`${SONGS_DIR}/index.json`);
      if (response.ok) {
        try {
          // Se o Jekyll processou, isso será um JSON válido
          const data = await response.clone().json();
          if (Array.isArray(data)) return data;
        } catch (e) {
          // Se falhar (ex: rodando local sem jekyll), o arquivo contem tags Liquid cruas.
          // Ignoramos e tentamos o fallback abaixo.
        }
      }

      // 2. Fallback: Tenta listar o diretório (Live Server / Local)
      const dirResponse = await fetch(`${SONGS_DIR}/`);
      if (!dirResponse.ok) {
        // Se ambos falharem, não temos o que fazer
        throw new Error(`HTTP ${dirResponse.status}`);
      }
      const html = await dirResponse.text();
      return extractSongNamesFromHtml(html);

    } catch (error) {
      console.error("Erro ao listar cifras automaticamente.", error);
      return [];
    }
  };

  const loadSongBank = async () => {
    const nomes = await fetchSongList();
    if (!nomes.length) {
      return [];
    }
    bancoDeCifras = nomes.map((nome) => ({
      nome,
      tom: DEFAULT_TOM,
    }));
    return bancoDeCifras;
  };

  const ensureSongBank = () => {
    if (!songsListingPromise) {
      songsListingPromise = loadSongBank();
    }
    return songsListingPromise;
  };

  const setSongTom = (nome, tom) => {
    if (!tom) {
      return;
    }
    appState.tom = tom;
    appState.tomOriginal = tom;
    tomInput.value = tom;
    const entry = bancoDeCifras.find((item) => item.nome === nome);
    if (entry) {
      entry.tom = tom;
    }
  };

  const preloadSongs = async () => {
    if (songsLoaded || !bancoDeCifras.length) return;
    const promises = bancoDeCifras.map(async (cifra) => {
      try {
        if (songCache[cifra.nome]) {
          return;
        }
        const response = await fetch(`${SONGS_DIR}/${cifra.nome}.txt`);
        const text = await response.text();
        const { tom } = storeSongContent(cifra.nome, text);
        if (tom) {
          cifra.tom = tom;
        }
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

  const setSearchSelection = (index) => {
    const items = Array.from(searchResults.querySelectorAll(".search-result-item"));
    if (!items.length) {
      searchSelectionIndex = -1;
      return;
    }
    const normalizedIndex = ((index % items.length) + items.length) % items.length;
    items.forEach((item, itemIndex) => {
      item.classList.toggle("active", itemIndex === normalizedIndex);
    });
    searchSelectionIndex = normalizedIndex;
    items[normalizedIndex].scrollIntoView({ block: "nearest" });
  };

  const activateSearchResult = (index) => {
    const item = lastSearchResults[index];
    if (!item) {
      return;
    }
    trocarCifra(item.nome);
    appState.modo = "letra"; // Force presentation mode
    updateModeUI();
    closeSearchOverlay();
  };

  const renderSearchResults = (results) => {
    searchResults.innerHTML = "";
    lastSearchResults = results;
    searchSelectionIndex = -1;
    if (results.length === 0) {
      if (searchInput.value.trim()) {
        searchResults.innerHTML = "<li style='padding:16px; color:var(--app-muted)'>Nenhum resultado encontrado.</li>";
      }
      return;
    }

    results.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "search-result-item";
      li.innerHTML = `
        <span class="result-title">${item.nome.replace(/_/g, " ")}</span>
        ${item.snippet ? `<span class="result-snippet">${escapeHtml(item.snippet)}</span>` : ""}
      `;
      li.addEventListener("click", () => {
        activateSearchResult(index);
      });
      searchResults.appendChild(li);
    });
    setSearchSelection(0);
  };

  const openSearchOverlay = () => {
    searchOverlay.classList.remove("hidden");
    searchOverlay.setAttribute("aria-hidden", "false");
    searchInput.focus();
    ensureSongBank().then(() => {
      if (!bancoDeCifras.length) {
        return;
      }
      preloadSongs().then(() => {
        if (searchInput.value) performSearch(searchInput.value);
      });
    });
  };

  const closeSearchOverlay = () => {
    searchOverlay.classList.add("hidden");
    searchOverlay.setAttribute("aria-hidden", "true");
    searchInput.value = "";
    searchResults.innerHTML = "";
    searchSelectionIndex = -1;
    lastSearchResults = [];
  };

  const updateThemeToggleState = () => {
    if (!themeToggle) {
      return;
    }
    if (appState.theme === "system") {
      themeToggle.checked = systemThemeQuery.matches;
      return;
    }
    themeToggle.checked = appState.theme === "dark";
  };

  const applyTheme = (theme) => {
    const normalizedTheme = theme || "system";
    appState.theme = normalizedTheme;
    if (normalizedTheme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", normalizedTheme);
    }
    updateThemeToggleState();
  };

  const loadThemePreference = () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      applyTheme(savedTheme);
      return;
    }
    applyTheme(appState.theme || "system");
  };

  const updateModeUI = () => {
    const isModoCifra = appState.modo === "cifra";
    modoCifraButton.classList.toggle("active", isModoCifra);
    modoLetraButton.classList.toggle("active", !isModoCifra);
    cifraView.classList.toggle("hidden", !isModoCifra);
    letraView.classList.toggle("hidden", isModoCifra);
    toneControls.classList.toggle("hidden", !isModoCifra);
    letraControls.classList.toggle("hidden", isModoCifra);
    document.body.classList.toggle(
      "compact-mode",
      appState.compactMode && !isModoCifra
    );
    document.body.classList.toggle("mode-cifra", isModoCifra);

    // Update Body Class for CSS overrides
    if (isModoCifra) {
      document.body.classList.remove("mode-letra");
      resetCompactFitOverrides();
      renderCifraView();
      updateCifraStyles();
    } else {
      document.body.classList.add("mode-letra");
      if (appState.compactMode) {
        appState.fontScale = DEFAULT_SLIDE_FONT_SCALE;
        appState.lineHeight = DEFAULT_SLIDE_LINE_HEIGHT;
      }
      renderSlide();
    }
  };

  const resetCompactFitOverrides = () => {
    if (!slideContent) {
      return;
    }
    slideContent.style.removeProperty("--slide-font-size");
    slideContent.style.removeProperty("--slide-line-height");
    slideContent.removeAttribute("data-compact-overflow");
  };

  const contentFitsSlide = () => {
    if (!slideContent) {
      return true;
    }
    const widthOverflow = slideContent.scrollWidth - slideContent.clientWidth;
    const heightOverflow = slideContent.scrollHeight - slideContent.clientHeight;
    return (
      widthOverflow <= COMPACT_FIT_LIMITS.overflowTolerancePx &&
      heightOverflow <= COMPACT_FIT_LIMITS.overflowTolerancePx
    );
  };

  const trimEmptyEdges = (lines) => {
    const trimmed = lines.slice();
    while (trimmed.length && !trimmed[0].trim().length) {
      trimmed.shift();
    }
    while (trimmed.length && !trimmed[trimmed.length - 1].trim().length) {
      trimmed.pop();
    }
    return trimmed;
  };

  const findCompactSplitIndex = (lines) => {
    const mid = Math.floor(lines.length / 2);
    const isEmpty = (line) => !line.trim().length;
    const isHeader = (line) => /^\s*\[.+\]\s*$/.test(line);
    let splitIndex = -1;

    for (let offset = 0; offset <= mid; offset += 1) {
      const forward = mid + offset;
      const backward = mid - offset;
      if (forward < lines.length && isEmpty(lines[forward])) {
        splitIndex = forward + 1;
        break;
      }
      if (backward >= 0 && isEmpty(lines[backward])) {
        splitIndex = backward + 1;
        break;
      }
    }

    if (splitIndex === -1) {
      for (let offset = 0; offset <= mid; offset += 1) {
        const forward = mid + offset;
        const backward = mid - offset;
        if (forward < lines.length && isHeader(lines[forward])) {
          splitIndex = forward;
          break;
        }
        if (backward >= 0 && isHeader(lines[backward])) {
          splitIndex = backward;
          break;
        }
      }
    }

    if (splitIndex <= 0 || splitIndex >= lines.length) {
      splitIndex = mid;
    }

    return splitIndex;
  };

  const paginateCompactSlide = () => {
    if (compactPaginationInProgress) {
      return false;
    }
    const currentSlide = appState.slides[appState.currentSlideIndex];
    if (!currentSlide || currentSlide.linhas.length < 2) {
      return false;
    }

    const splitIndex = findCompactSplitIndex(currentSlide.linhas);
    const firstLines = trimEmptyEdges(currentSlide.linhas.slice(0, splitIndex));
    const secondLines = trimEmptyEdges(currentSlide.linhas.slice(splitIndex));

    if (!firstLines.length || !secondLines.length) {
      return false;
    }

    compactPaginationInProgress = true;
    const firstSlide = { titulo: currentSlide.titulo, linhas: firstLines };
    const secondSlide = { titulo: currentSlide.titulo, linhas: secondLines };
    appState.slides.splice(
      appState.currentSlideIndex,
      1,
      firstSlide,
      secondSlide
    );
    renderSlide();
    compactPaginationInProgress = false;
    return true;
  };

  /**
   * Ajusta line-height e font-size para encaixar o conteudo sem rolagem,
   * priorizando reduzir o line-height antes do font-size.
   */
  const applyCompactShrinkToFit = () => {
    if (!slideContent || appState.modo !== "letra" || !appState.compactMode) {
      return;
    }
    if (compactPaginationInProgress) {
      return;
    }

    const sample =
      slideContent.querySelector("p") || slideContent.querySelector("h1, h4");
    if (!sample) {
      return;
    }

    const computed = window.getComputedStyle(sample);
    const baseFontSizePx = parseFloat(computed.fontSize);
    const baseLineHeightPx = parseFloat(computed.lineHeight);

    if (!baseFontSizePx || Number.isNaN(baseFontSizePx)) {
      return;
    }

    let lineHeightRatio = appState.lineHeight;
    if (!Number.isNaN(baseLineHeightPx) && baseLineHeightPx > 0) {
      lineHeightRatio = baseLineHeightPx / baseFontSizePx;
    }

    const minLineHeightRatio = Math.min(
      COMPACT_FIT_LIMITS.minLineHeightRatio,
      lineHeightRatio
    );
    let fontSizePx = baseFontSizePx;
    const minFontSizePx = Math.min(
      COMPACT_FIT_LIMITS.minFontSizePx,
      fontSizePx
    );

    if (contentFitsSlide()) {
      return;
    }

    let iterations = 0;
    while (!contentFitsSlide() && iterations < COMPACT_FIT_LIMITS.maxIterations) {
      if (lineHeightRatio - COMPACT_FIT_LIMITS.lineHeightStep >= minLineHeightRatio) {
        lineHeightRatio = Math.max(
          minLineHeightRatio,
          lineHeightRatio - COMPACT_FIT_LIMITS.lineHeightStep
        );
        slideContent.style.setProperty(
          "--slide-line-height",
          lineHeightRatio.toFixed(3)
        );
      } else if (fontSizePx - COMPACT_FIT_LIMITS.fontSizeStep >= minFontSizePx) {
        fontSizePx = Math.max(
          minFontSizePx,
          fontSizePx - COMPACT_FIT_LIMITS.fontSizeStep
        );
        slideContent.style.setProperty(
          "--slide-font-size",
          `${fontSizePx.toFixed(2)}px`
        );
      } else {
        break;
      }
      iterations += 1;
    }

    if (!contentFitsSlide()) {
      if (paginateCompactSlide()) {
        return;
      }
      slideContent.dataset.compactOverflow = "true";
      console.error(
        "Compact fit falhou: minimo de fonte/altura atingido. Considere paginar."
      );
    }
  };

  const scheduleCompactFit = () => {
    if (!slideContent) {
      return;
    }
    if (!appState.compactMode || appState.modo !== "letra") {
      if (compactFitFrameId !== null) {
        cancelAnimationFrame(compactFitFrameId);
        compactFitFrameId = null;
      }
      resetCompactFitOverrides();
      return;
    }

    resetCompactFitOverrides();
    if (compactFitFrameId !== null) {
      cancelAnimationFrame(compactFitFrameId);
    }
    compactFitFrameId = requestAnimationFrame(() => {
      compactFitFrameId = null;
      applyCompactShrinkToFit();
    });
  };

  const updateCifraStyles = () => {
    if (!cifraView) {
      return;
    }
    const computedSize = (BASE_CIFRA_FONT_SIZE * appState.cifraFontScale).toFixed(2);
    cifraView.style.setProperty("--cifra-font-size", `${computedSize}rem`);
    cifraView.style.setProperty(
      "--cifra-line-height",
      appState.cifraLineHeight.toFixed(2)
    );
    fontSizeValue.textContent = `${Math.round(appState.cifraFontScale * 100)}%`;
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
    scheduleCompactFit();
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
        if (appState.compactMode) {
          const headerMatch = linha.match(/^\[(.+)\]$/);
          if (headerMatch) {
            return `<h4 class="compact-header">${escapeHtml(headerMatch[1])}</h4>`;
          }
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

    const fallbackTom = cifraSelecionada.tom || DEFAULT_TOM;

    // Use cached if available
    if (songCache[nomeCifra]) {
      const cachedTom = songMetaCache[nomeCifra] || fallbackTom;
      setSongTom(nomeCifra, cachedTom);
      processCifraData(songCache[nomeCifra]);
    } else {
      fetch(`${SONGS_DIR}/${nomeCifra}.txt`)
        .then((response) => response.text())
        .then((data) => {
          const { tom, text } = storeSongContent(nomeCifra, data);
          setSongTom(nomeCifra, tom || fallbackTom);
          processCifraData(text);
        })
        .catch((error) => {
          console.error(`Erro ao carregar ${nomeCifra}`, error);
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
    if (appState.modo === "cifra") {
      updateCifraStyles();
    }

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
    if (appState.modo === "cifra") {
      const novoValor = Math.min(2.5, Math.max(0.3, appState.cifraFontScale + delta));
      if (novoValor !== appState.cifraFontScale) {
        appState.cifraFontScale = novoValor;
        updateCifraStyles();
      }
      return;
    }

    const novoValor = Math.min(2.5, Math.max(0.3, appState.fontScale + delta));
    if (novoValor !== appState.fontScale) {
      appState.fontScale = novoValor;
      updateSlideStyles();
    }
  };

  const ajustarLineHeight = (delta) => {
    if (appState.modo === "cifra") {
      const novoValor = Math.min(
        3.0,
        Math.max(1.0, appState.cifraLineHeight + delta)
      );
      if (novoValor !== appState.cifraLineHeight) {
        appState.cifraLineHeight = novoValor;
        updateCifraStyles();
      }
      return;
    }

    const novoValor = Math.min(3.0, Math.max(1.0, appState.lineHeight + delta));
    if (novoValor !== appState.lineHeight) {
      appState.lineHeight = novoValor;
      updateSlideStyles();
    }
  };

  window.addEventListener("resize", () => {
    if (appState.modo === "cifra") {
      renderCifraView();
      updateCifraStyles();
      return;
    }
    if (appState.modo === "letra") {
      updateSlideStyles();
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

  columnSelect.addEventListener("change", (event) => {
    appState.columnLayout = event.target.value;
    if (appState.modo === "cifra") {
      updateCifraStyles();
      return;
    }
    updateSlideStyles();
  });

  if (themeToggle) {
    themeToggle.addEventListener("change", () => {
      const selectedTheme = themeToggle.checked ? "dark" : "light";
      applyTheme(selectedTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
      } catch (error) {
        console.error("Nao foi possivel salvar o tema.", error);
      }
    });
  }

  if (systemThemeQuery?.addEventListener) {
    systemThemeQuery.addEventListener("change", () => {
      if (appState.theme === "system") {
        applyTheme("system");
      }
    });
  } else if (systemThemeQuery?.addListener) {
    systemThemeQuery.addListener(() => {
      if (appState.theme === "system") {
        applyTheme("system");
      }
    });
  }

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
    const isSearchOpen = !searchOverlay.classList.contains("hidden");
    const key = event.key.toLowerCase();
    const isCmdOrCtrl = event.metaKey || event.ctrlKey;

    if (isCmdOrCtrl && key === "m") {
      event.preventDefault();
      appState.modo = appState.modo === "cifra" ? "letra" : "cifra";
      updateModeUI();
      if (isSearchOpen) {
        closeSearchOverlay();
      }
      return;
    }

    if (isCmdOrCtrl && event.shiftKey && key === "f") {
      event.preventDefault();
      openSearchOverlay();
      return;
    }

    // Shortcuts work in Letra mode OR if search is not open
    if (!isSearchOpen) {
      // Open search with '/' or Ctrl+K
      if (event.key === "/" || (isCmdOrCtrl && key === "k")) {
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
  searchInput.addEventListener("keydown", (event) => {
    if (searchOverlay.classList.contains("hidden")) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!lastSearchResults.length) {
        return;
      }
      const nextIndex =
        searchSelectionIndex < 0 ? 0 : searchSelectionIndex + 1;
      setSearchSelection(nextIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!lastSearchResults.length) {
        return;
      }
      const prevIndex =
        searchSelectionIndex < 0
          ? lastSearchResults.length - 1
          : searchSelectionIndex - 1;
      setSearchSelection(prevIndex);
    } else if (event.key === "Enter") {
      if (searchSelectionIndex >= 0) {
        event.preventDefault();
        activateSearchResult(searchSelectionIndex);
      }
    }
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
      if (appState.compactMode) {
        appState.fontScale = DEFAULT_SLIDE_FONT_SCALE;
        appState.lineHeight = DEFAULT_SLIDE_LINE_HEIGHT;
      }
      document.body.classList.toggle(
        "compact-mode",
        appState.compactMode && appState.modo === "letra"
      );
      // Re-parse/build slides from original data
      if (appState.cifraOriginal) {
        appState.slides = parseSlidesFromText(appState.cifraOriginal);
        appState.currentSlideIndex = 0;
        renderSlide();
      }
    });
  }

  const initSongs = () => {
    ensureSongBank().then(() => {
      if (!bancoDeCifras.length) {
        console.error(
          `Nenhuma cifra encontrada em ${SONGS_DIR}/. Verifique o servidor.`
        );
        return;
      }
      trocarCifra(bancoDeCifras[0].nome);
      setTimeout(preloadSongs, 1000);
    });
  };

  loadThemePreference();

  // Initial UI Sync
  updateModeUI();

  // Initial load
  initSongs();
});
