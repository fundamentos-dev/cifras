let bancoDeCifras = [
  {
    tom: "D",
    nome: "harpa_crista_alvo_mais_que_a_neve",
    afinacao: "E",
  },
  {
    tom: "C",
    nome: "grupo_logos_autor_da_minha_fe",
    afinacao: "E",
  },
];

let appState = {
  tom: "D",
  tomOriginal: "D",
  afinacao: "E",
  afinacaoOriginal: "E",
  cifras: [],
  cifraOriginal: "", // Útil para reconhecimento de padrões na hora de fazer a substituição
  linhas: [],
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

const renderDependingOnWindowSize = () => {
  // Get width and height of the window excluding scrollbars

  /**
   *
   * @param {string} modo "mobile" ou "desktop" para controlar as quebras
   * @param {int} cifraChar Número de caracteres por linha na cifra
   */
  const render = (modo = "desktop", cifraChar = 32) => {
    const cifrasOrdenadas = appState.cifras
      .slice()
      .sort((a, b) => (a.linha > b.linha ? 1 : b.linha > a.linha ? -1 : 0));
    let cifraRenderizada = "";

    cifrasOrdenadas.forEach((instancia) => {
      cifraRenderizada += instancia.render(modo, cifraChar);
    });

    document.getElementById('cifra').innerHTML = cifraRenderizada;
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
  "Eb": 4,
  E: 5,
  F: 6,
  "F#": 7,
  G: 8,
  "Ab": 9,
  A: 10,
  "Bb": 11,
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

const afinacoes = [
  new Afinacao("Cebolão de D", "D", [
    new Corda("D"),
    new Corda("A"),
    new Corda("F#"),
    new Corda("D"),
    new Corda("A"),
  ]),
  new Afinacao("Cebolão de E", "E", [
    new Corda("E"),
    new Corda("B"),
    new Corda("G#"),
    new Corda("E"),
    new Corda("B"),
  ]),
];

const afinacoesPorApelido = afinacoes.reduce((acc, cur) => {
  return { ...acc, [cur.apelido]: cur };
}, {});
