const SONGS_DIR = "examples";
const DEFAULT_TOM = "C";
let bancoDeCifras = [];

let appState = {
  tom: DEFAULT_TOM,
  tomOriginal: DEFAULT_TOM,
  cifras: [],
  cifraOriginal: "",
  linhas: [],
  modo: "cifra",
  slides: [],
  currentSlideIndex: 0,
  fontScale: 1,
  lineHeight: 1.5,
  cifraFontScale: 1,
  cifraLineHeight: 1.5,
  columnLayout: "auto",
  compactMode: true,
  theme: "system",
  // Metadados da musica corrente (preenchidos a partir do cabecalho do .txt)
  songTitle: "",
  songOrdem: null,
  songFontScale: 1,
};

const checkCifraLines = (cifra) => {
  const cifrasByLine = cifra.split("\n"),
    linesDescription = [];
  cifrasByLine.forEach((line, index) => {
    linesDescription.push({
      length: line.length,
      order: index,
      start: index - 1 >= 0 ? linesDescription[index - 1].end + 1 : 0,
      end:
        index - 1 >= 0
          ? linesDescription[index - 1].end + 1 + line.length
          : line.length,
    });
  });
  return linesDescription;
};

const renderCifraView = () => {
  const render = (modo = "desktop", cifraChar = 32) => {
    const cifrasOrdenadas = appState.cifras
      .slice()
      .sort((a, b) => (a.linha > b.linha ? 1 : b.linha > a.linha ? -1 : 0));
    
    // Check for chords
    const hasChords = cifrasOrdenadas.some(c => c.linhaCifraOriginal && c.linhaCifraOriginal.trim().length > 0);
    
    // Get Title (First line of original text)
    const title = appState.cifraOriginal ? appState.cifraOriginal.split('\n')[0] : "";
    
    let cifraRenderizada = "";

    // Add Title
    if (title) {
        cifraRenderizada += `<h3 class="cifra-title">${title}</h3>\n`;
    }

    if (!hasChords) {
        cifraRenderizada += `<div class="no-chords-container">
            <p class="no-chords-message">Essa música não tem cifras cadastradas.</p>
        </div>\n`;
    } else {
        cifrasOrdenadas.forEach((instancia) => {
          cifraRenderizada += instancia.render(modo, cifraChar);
        });
    }

    document.getElementById("cifra").innerHTML = cifraRenderizada;
    return cifraRenderizada;
  };

  const w = document.documentElement.clientWidth;
  if (w < 340) {
    render("mobile");
  } else if (w < 680) {
    render("mobile", 16);
  } else {
    render();
  }
};

/**
 * Relação das 12 notas ocidentais, atribuindo o mesmo número
 * a notas equivalentes numa mesma oitava
 */
const dicionarioNotas = {
  Cb: 12,
  "C#": 2,
  C: 1,
  Db: 2,
  "D#": 4,
  D: 3,
  Eb: 4,
  "E#": 6,
  E: 5,
  Fb: 5,
  "F#": 7,
  F: 6,
  Gb: 7,
  "G#": 9,
  G: 8,
  Ab: 9,
  "A#": 11,
  A: 10,
  Bb: 11,
  "B#": 1,
  B: 12,
};

let dicionarioTons = {
  C: 1,
  "C#": 2,
  D: 3,
  Eb: 4,
  E: 5,
  F: 6,
  "F#": 7,
  G: 8,
  Ab: 9,
  A: 10,
  Bb: 11,
  B: 12,
};

// Adicionando tons menores
Object.entries(dicionarioTons).forEach((tom) => {
  dicionarioTons[`${tom[0]}m`] = tom[1];
});

let acordes = [...Object.keys(dicionarioNotas)];
// Adicionando variantes de notas
const variantes = ["7", "m", "m7", "m7(b5)", "M", "maj7", "M7", "dim"];
acordes.forEach((acorde) => {
  variantes.forEach((variante) => {
    acordes.push(`${acorde}${variante}`);
  });
});
// Adicionando baixos
acordes.forEach((acorde) => {
  Object.keys(dicionarioNotas).forEach((baixo) => {
    acordes.push(`${acorde}/${baixo}`);
  });
});
