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
  const FIT_LIMITS = {
    minLineHeightRatio: 1.05,
    lineHeightStep: 0.02,
    minFontSizePx: 13,
    fontSizeStep: 0.5,
    maxIterations: 300,
    overflowTolerancePx: 1,
  };
  // Abaixo desta largura (px) nunca usamos 2 colunas: a fonte ficaria pequena
  // demais para leitura a distancia.
  const MIN_TWO_COLUMN_WIDTH = 720;
  const THEME_STORAGE_KEY = "cifras-theme";
  const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  let fitFrameId = null;
  let paginationInProgress = false;
  let resizeFrameId = null;
  let searchSelectionIndex = -1;
  let lastSearchResults = [];

  // Orcamento de linhas para considerar um slide compacto "cheio" antes de
  // mesclar a proxima secao. A paginacao por estrofe e o shrink-to-fit cuidam
  // do encaixe fino; este valor e apenas o ponto de partida da mesclagem.
  const COMPACT_LINE_BUDGET = 30;

  const contarLinhasElemento = (elemento) =>
    elemento.tipo === "estrofe" ? elemento.linhas.length : 1;

  const contarLinhasSlide = (slide) =>
    slide.elementos.reduce((total, el) => total + contarLinhasElemento(el), 0);

  /**
   * Quebra o texto da letra em secoes ([Titulo]) e, dentro de cada secao,
   * em estrofes (blocos de linhas separados por linha em branco). Linhas de
   * cifra sao descartadas no modo letra. A estrofe e a unidade indivisivel:
   * nunca deve ser quebrada entre colunas ou slides.
   */
  const parseSecoes = (texto) => {
    const linhas = texto.split(/\r?\n/);
    const secoes = [];
    let secaoAtual = null;
    let blocoAtual = null;

    const fecharBloco = () => {
      if (blocoAtual && blocoAtual.length) {
        secaoAtual.blocos.push(blocoAtual);
      }
      blocoAtual = null;
    };

    const fecharSecao = () => {
      if (!secaoAtual) {
        return;
      }
      fecharBloco();
      if (secaoAtual.titulo || secaoAtual.blocos.length) {
        secoes.push(secaoAtual);
      }
      secaoAtual = null;
    };

    linhas.forEach((linha) => {
      const tituloMatch = linha.match(/^\s*\[(.+?)\]\s*$/);
      if (tituloMatch) {
        fecharSecao();
        secaoAtual = { titulo: tituloMatch[1].trim(), blocos: [] };
        return;
      }
      if (!secaoAtual) {
        secaoAtual = { titulo: "", blocos: [] };
      }
      if (Cifra.isLinhaCifra(linha)) {
        return;
      }
      const conteudo = linha.replace(/\s+$/, "");
      if (!conteudo.trim().length) {
        fecharBloco();
        return;
      }
      if (!blocoAtual) {
        blocoAtual = [];
      }
      blocoAtual.push(conteudo);
    });

    fecharSecao();
    return secoes;
  };

  /**
   * Compatibilidade: uma secao com titulo mas SEM conteudo (ex.: [Refrao]
   * repetido vazio) reutiliza o conteudo da primeira ocorrencia com mesmo
   * nome. Secoes sem conteudo e sem correspondencia sao descartadas.
   */
  const resolverRepeticoes = (secoes) => {
    const mapa = {};
    secoes.forEach((secao) => {
      const chave = normalizeText(secao.titulo);
      if (secao.blocos.length && !mapa[chave]) {
        mapa[chave] = secao.blocos;
      }
    });
    return secoes
      .map((secao) => {
        if (secao.blocos.length) {
          return secao;
        }
        const blocos = mapa[normalizeText(secao.titulo)];
        return blocos ? { titulo: secao.titulo, blocos } : secao;
      })
      .filter((secao) => secao.blocos.length);
  };

  /**
   * Aplica a metadata "Ordem:" expandindo/reordenando as secoes pelo nome.
   * Secoes repetidas (ex.: Refrao) sao reutilizadas a partir da primeira
   * ocorrencia com conteudo. Sem "Ordem:" mantem a ordem do documento.
   */
  const montarSequencia = (secoes, ordem) => {
    if (!ordem || !ordem.length) {
      return secoes;
    }
    const mapa = {};
    secoes.forEach((secao) => {
      const chave = normalizeText(secao.titulo);
      if (secao.blocos.length && !mapa[chave]) {
        mapa[chave] = secao;
      }
    });
    const sequencia = [];
    ordem.forEach((nome) => {
      const secao = mapa[normalizeText(nome)];
      if (secao) {
        sequencia.push({ titulo: secao.titulo, blocos: secao.blocos });
      }
    });
    return sequencia.length ? sequencia : secoes;
  };

  /**
   * Converte secoes ordenadas em slides. Cada slide tem uma lista de
   * "elementos" ({ tipo: "header" } ou { tipo: "estrofe", linhas }).
   * No modo normal cada secao vira um slide; no compacto as secoes sao
   * mescladas ate o orcamento de linhas, sempre preservando estrofes inteiras.
   */
  const buildSlides = (secoes) => {
    const elementosDaSecao = (secao, incluirHeader) => {
      const elementos = [];
      if (incluirHeader && secao.titulo) {
        elementos.push({ tipo: "header", texto: secao.titulo });
      }
      secao.blocos.forEach((linhas) => {
        elementos.push({ tipo: "estrofe", linhas });
      });
      return elementos;
    };

    if (!appState.compactMode) {
      const slides = secoes
        .map((secao) => ({
          titulo: secao.titulo,
          elementos: elementosDaSecao(secao, false),
        }))
        .filter((slide) => slide.elementos.length || slide.titulo);
      // Modo normal: o titulo da musica fica num slide proprio, no inicio.
      if (appState.songTitle) {
        slides.unshift({ titulo: appState.songTitle, elementos: [], isTitle: true });
      }
      return slides;
    }

    const slides = [];
    let atual = null;
    const novoSlide = () => {
      atual = { titulo: "", elementos: [] };
    };
    novoSlide();

    secoes.forEach((secao) => {
      const elementos = elementosDaSecao(secao, true);
      const custo = elementos.reduce(
        (total, el) => total + contarLinhasElemento(el),
        0
      );
      const atualCusto = contarLinhasSlide(atual);
      if (atualCusto > 0 && atualCusto + custo > COMPACT_LINE_BUDGET) {
        slides.push(atual);
        novoSlide();
      }
      elementos.forEach((el) => {
        if (!atual.titulo && el.tipo === "header") {
          atual.titulo = el.texto;
        }
        atual.elementos.push(el);
      });
    });

    if (atual.elementos.length) {
      slides.push(atual);
    }
    return slides.length ? slides : [{ titulo: "", elementos: [] }];
  };

  const parseSlidesFromText = (texto) => {
    const secoes = resolverRepeticoes(parseSecoes(texto));
    if (!secoes.length) {
      const linhas = texto
        .split(/\r?\n/)
        .map((linha) => linha.replace(/\s+$/, ""))
        .filter((linha) => linha.trim().length);
      if (!linhas.length) {
        return [];
      }
      return buildSlides([{ titulo: "", blocos: [linhas] }]);
    }
    const ordenadas = montarSequencia(secoes, appState.songOrdem);
    return buildSlides(ordenadas);
  };

  /**
   * (Re)constroi os slides a partir do texto da musica corrente, separando o
   * titulo (primeira linha nao vazia) do corpo da letra.
   */
  const construirSlides = () => {
    const data = appState.cifraOriginal || "";
    const linhasData = data.split(/\r?\n/);
    const idxTitulo = linhasData.findIndex((linha) => linha.trim().length);
    appState.songTitle = idxTitulo >= 0 ? linhasData[idxTitulo].trim() : "";
    const corpo = idxTitulo >= 0 ? linhasData.slice(idxTitulo + 1).join("\n") : data;
    appState.slides = parseSlidesFromText(corpo);
    appState.currentSlideIndex = 0;
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

  const TOM_METADATA_REGEX = /^\s*Tom:\s*([A-G](?:#|b)?m?)\s*$/i;
  const ORDEM_METADATA_REGEX = /^\s*Ordem:\s*(.+)$/i;
  const FONTE_METADATA_REGEX = /^\s*Fonte:\s*(.+)$/i;
  // "Link: https://..." referencia externa (ex.: Spotify/YouTube). Reconhecido e
  // removido do corpo; a interface ainda nao o exibe.
  const LINK_METADATA_REGEX = /^\s*Link:\s*(.+)$/i;

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

  // "Ordem: Intro > Estrofe 1 > Refrao" (aceita ">" ou "," como separador).
  const parseOrdem = (raw) => {
    if (!raw) {
      return null;
    }
    const nomes = raw
      .split(/[>,]/)
      .map((nome) => nome.trim())
      .filter(Boolean);
    return nomes.length ? nomes : null;
  };

  // "Fonte: auto" (encaixe automatico) ou "Fonte: 90%" / "Fonte: 0.9".
  const parseFonte = (raw) => {
    if (!raw) {
      return null;
    }
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === "auto" || trimmed === "automatica" || trimmed === "automática") {
      return null;
    }
    let valor = parseFloat(trimmed.replace(",", "."));
    if (Number.isNaN(valor)) {
      return null;
    }
    if (trimmed.includes("%") || valor > 3) {
      valor = valor / 100;
    }
    return Math.min(2.5, Math.max(0.3, valor));
  };

  /**
   * Extrai metadados ("Tom:", "Ordem:", "Fonte:") do cabecalho (linhas logo
   * apos o titulo, antes da primeira linha em branco ou secao) e remove essas
   * linhas do texto.
   * @param {string} rawText
   * @returns {{tom:(string|null), ordem:(string[]|null), fontScale:(number|null), text:string}}
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
    let ordem = null;
    let fontScale = null;
    let link = null;
    const metadataIndexes = [];

    if (titleIndex !== -1) {
      for (let i = titleIndex + 1; i < lines.length; i += 1) {
        const trimmed = lines[i].trim();
        if (!trimmed.length || /^\[.+\]$/.test(trimmed)) {
          break;
        }
        const tomMatch = trimmed.match(TOM_METADATA_REGEX);
        const ordemMatch = trimmed.match(ORDEM_METADATA_REGEX);
        const fonteMatch = trimmed.match(FONTE_METADATA_REGEX);
        const linkMatch = trimmed.match(LINK_METADATA_REGEX);
        if (tomMatch) {
          tom = normalizeTom(tomMatch[1]);
          metadataIndexes.push(i);
        } else if (ordemMatch) {
          ordem = parseOrdem(ordemMatch[1]);
          metadataIndexes.push(i);
        } else if (fonteMatch) {
          fontScale = parseFonte(fonteMatch[1]);
          metadataIndexes.push(i);
        } else if (linkMatch) {
          link = linkMatch[1].trim();
          metadataIndexes.push(i);
        } else {
          // Linha que nao e metadado conhecido encerra o cabecalho.
          break;
        }
      }
    }

    metadataIndexes
      .sort((a, b) => b - a)
      .forEach((index) => lines.splice(index, 1));

    return {
      tom,
      ordem,
      fontScale,
      link,
      text: lines.join("\n"),
    };
  };

  const storeSongContent = (nome, rawText) => {
    const meta = parseSongMetadata(rawText);
    songCache[nome] = meta.text;
    songMetaCache[nome] = {
      tom: meta.tom,
      ordem: meta.ordem,
      fontScale: meta.fontScale,
    };
    return meta;
  };

  const baseFontScale = () =>
    appState.songFontScale && appState.songFontScale > 0
      ? appState.songFontScale
      : DEFAULT_SLIDE_FONT_SCALE;

  /**
   * Aplica os metadados da musica ao estado: tom (com fallback), ordem dos
   * trechos e escala de fonte base usada como ponto de partida nos slides.
   */
  const applySongMeta = (nome, meta, fallbackTom) => {
    const tom = (meta && meta.tom) || fallbackTom || DEFAULT_TOM;
    appState.tom = tom;
    appState.tomOriginal = tom;
    tomInput.value = tom;
    const entry = bancoDeCifras.find((item) => item.nome === nome);
    if (entry) {
      entry.tom = tom;
    }
    appState.songOrdem = (meta && meta.ordem) || null;
    appState.songFontScale = (meta && meta.fontScale) || 1;
    appState.fontScale = baseFontScale();
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
      resetFitOverrides();
      renderCifraView();
      updateCifraStyles();
    } else {
      document.body.classList.add("mode-letra");
      if (appState.compactMode) {
        appState.fontScale = baseFontScale();
        appState.lineHeight = DEFAULT_SLIDE_LINE_HEIGHT;
      }
      // Reconstroi para descartar paginacoes acumuladas em sessoes anteriores.
      construirSlides();
      renderSlide();
    }
  };

  const resetFitOverrides = () => {
    if (!slideContent) {
      return;
    }
    slideContent.style.removeProperty("--slide-font-size");
    slideContent.style.removeProperty("--slide-line-height");
    slideContent.removeAttribute("data-slide-overflow");
  };

  const contentFitsSlide = () => {
    if (!slideContent) {
      return true;
    }
    const widthOverflow = slideContent.scrollWidth - slideContent.clientWidth;
    const heightOverflow = slideContent.scrollHeight - slideContent.clientHeight;
    return (
      widthOverflow <= FIT_LIMITS.overflowTolerancePx &&
      heightOverflow <= FIT_LIMITS.overflowTolerancePx
    );
  };

  /**
   * Divide o slide atual em dois, em uma fronteira ENTRE elementos (estrofes /
   * cabecalhos) proxima do meio. Nunca quebra uma estrofe ao meio. Evita
   * deixar um cabecalho orfao no fim do primeiro slide.
   */
  const paginateSlide = () => {
    if (paginationInProgress) {
      return false;
    }
    const slide = appState.slides[appState.currentSlideIndex];
    if (!slide || slide.elementos.length < 2) {
      return false;
    }

    let splitIndex = Math.floor(slide.elementos.length / 2);
    if (
      slide.elementos[splitIndex - 1] &&
      slide.elementos[splitIndex - 1].tipo === "header"
    ) {
      splitIndex -= 1;
    }
    if (splitIndex <= 0) {
      splitIndex = 1;
    }

    const primeiros = slide.elementos.slice(0, splitIndex);
    const segundos = slide.elementos.slice(splitIndex);
    if (!primeiros.length || !segundos.length) {
      return false;
    }

    paginationInProgress = true;
    appState.slides.splice(
      appState.currentSlideIndex,
      1,
      { titulo: slide.titulo, elementos: primeiros },
      { titulo: slide.titulo, elementos: segundos }
    );
    renderSlide();
    paginationInProgress = false;
    return true;
  };

  /**
   * Ajusta line-height e font-size para encaixar o conteudo do slide sem
   * rolagem, priorizando reduzir o line-height antes do font-size. Vale para
   * os modos compacto E normal: a letra deve sempre caber na tela.
   */
  const applyShrinkToFit = () => {
    if (!slideContent || appState.modo !== "letra") {
      return;
    }
    if (paginationInProgress) {
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
      FIT_LIMITS.minLineHeightRatio,
      lineHeightRatio
    );
    let fontSizePx = baseFontSizePx;
    const minFontSizePx = Math.min(FIT_LIMITS.minFontSizePx, fontSizePx);

    if (contentFitsSlide()) {
      return;
    }

    let iterations = 0;
    while (!contentFitsSlide() && iterations < FIT_LIMITS.maxIterations) {
      if (lineHeightRatio - FIT_LIMITS.lineHeightStep >= minLineHeightRatio) {
        lineHeightRatio = Math.max(
          minLineHeightRatio,
          lineHeightRatio - FIT_LIMITS.lineHeightStep
        );
        slideContent.style.setProperty(
          "--slide-line-height",
          lineHeightRatio.toFixed(3)
        );
      } else if (fontSizePx - FIT_LIMITS.fontSizeStep >= minFontSizePx) {
        fontSizePx = Math.max(
          minFontSizePx,
          fontSizePx - FIT_LIMITS.fontSizeStep
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
      // Tenta dividir em mais slides (sempre entre estrofes inteiras).
      if (paginateSlide()) {
        return;
      }
      // Ultimo recurso: uma unica estrofe maior que a tela mesmo na fonte
      // minima. Libera rolagem para nao cortar o texto.
      slideContent.dataset.slideOverflow = "true";
      console.warn(
        "Encaixe atingiu o minimo de fonte/altura em uma estrofe indivisivel; rolagem liberada."
      );
    }
  };

  const scheduleFit = () => {
    if (!slideContent) {
      return;
    }
    if (appState.modo !== "letra") {
      if (fitFrameId !== null) {
        cancelAnimationFrame(fitFrameId);
        fitFrameId = null;
      }
      resetFitOverrides();
      return;
    }

    resetFitOverrides();
    if (fitFrameId !== null) {
      cancelAnimationFrame(fitFrameId);
    }
    fitFrameId = requestAnimationFrame(() => {
      fitFrameId = null;
      applyShrinkToFit();
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
    
    // Logica de colunas: 2 colunas exigem largura minima (telas estreitas
    // ficam ilegiveis em 2 colunas). Abaixo do limite, sempre 1 coluna,
    // mesmo que o usuario tenha escolhido 2.
    const larguraSuficiente =
      slideContent.clientWidth >= MIN_TWO_COLUMN_WIDTH;
    // Expoe ao CSS se 2 colunas sao possiveis (controle de colunas so aparece
    // quando pode ter efeito).
    document.body.classList.toggle("can-two-columns", larguraSuficiente);
    let useTwoColumns = false;
    if (larguraSuficiente) {
      if (appState.columnLayout === "2") {
        useTwoColumns = true;
      } else if (appState.columnLayout === "auto") {
        // Heuristica: muitas linhas viram duas colunas (estrofes inteiras por coluna).
        const currentSlide = appState.slides[appState.currentSlideIndex];
        if (currentSlide && contarLinhasSlide(currentSlide) > 16) {
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
    scheduleFit();
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

    // Slide de titulo dedicado (modo normal): so o nome da musica.
    const isTitleSlide = Boolean(slide.isTitle);
    slideContent.classList.toggle("title-slide", isTitleSlide);

    let html = "";
    if (isTitleSlide) {
      html += `<h1 class="slide-main-title">${escapeHtml(appState.songTitle)}</h1>`;
    } else if (!slide.elementos.length) {
      html += "<p>&nbsp;</p>";
    } else {
      slide.elementos.forEach((elemento) => {
        if (elemento.tipo === "header") {
          html += `<h4 class="compact-header">${escapeHtml(elemento.texto)}</h4>`;
          return;
        }
        // Estrofe: bloco indivisivel (break-inside: avoid via CSS).
        const linhasHtml = elemento.linhas
          .map((linha) => `<p>${escapeHtml(linha)}</p>`)
          .join("");
        html += `<div class="slide-stanza">${linhasHtml}</div>`;
      });
    }

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
      applySongMeta(nomeCifra, songMetaCache[nomeCifra], fallbackTom);
      processCifraData(songCache[nomeCifra]);
    } else {
      fetch(`${SONGS_DIR}/${nomeCifra}.txt`)
        .then((response) => response.text())
        .then((data) => {
          const meta = storeSongContent(nomeCifra, data);
          applySongMeta(nomeCifra, meta, fallbackTom);
          processCifraData(meta.text);
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

    construirSlides();

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
      // Debounce: reconstroi os slides para a nova largura (descartando
      // paginacoes feitas para a largura anterior) e reencaixa a letra.
      if (resizeFrameId !== null) {
        cancelAnimationFrame(resizeFrameId);
      }
      resizeFrameId = requestAnimationFrame(() => {
        resizeFrameId = null;
        if (appState.compactMode) {
          appState.fontScale = baseFontScale();
          appState.lineHeight = DEFAULT_SLIDE_LINE_HEIGHT;
        }
        construirSlides();
        renderSlide();
      });
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
        appState.fontScale = baseFontScale();
        appState.lineHeight = DEFAULT_SLIDE_LINE_HEIGHT;
      }
      document.body.classList.toggle(
        "compact-mode",
        appState.compactMode && appState.modo === "letra"
      );
      // Reconstroi os slides a partir do texto original com o novo modo.
      if (appState.cifraOriginal) {
        construirSlides();
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
