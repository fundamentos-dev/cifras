let bancoDeCifras = [
  {
    tom: "D",
    nome: "harpa_crista_alvo_mais_que_a_neve",
  },
  {
    tom: "C",
    nome: "grupo_logos_autor_da_minha_fe",
  },
  {
    tom: "C",
    nome: "adhemar_de_campos_grande_e_o_senhor",
  },
  {
    tom: "C",
    nome: "asaph_borba_minhalma_engrandece_ao_senhor",
  },
  {
    tom: "C",
    nome: "diante_do_trono_preciso_de_ti",
  },
  {
    tom: "C",
    nome: "fhop_music_tu_es",
  },
  {
    tom: "C",
    nome: "indelevel_coracao_ensinavel",
  },
  {
    tom: "C",
    nome: "isaias_saad_ousado_amor",
  },
  {
    tom: "C",
    nome: "projeto_sola_ressureicao",
  },
];

let appState = {
  tom: "D",
  tomOriginal: "D",
  cifras: [],
  cifraOriginal: "",
  linhas: [],
  modo: "cifra",
  slides: [],
  currentSlideIndex: 0,
  fontScale: 1,
  lineHeight: 1.5,
  columnLayout: "auto",
  compactMode: false,
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
    let cifraRenderizada = "";

    cifrasOrdenadas.forEach((instancia) => {
      cifraRenderizada += instancia.render(modo, cifraChar);
    });

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

const parseSlidesFromText = (texto) => {
  const linhas = texto.split(/\r?\n/);
  const secoes = [];
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
    const possuiConteudo = secaoAtual.linhas.some((linha) => linha.trim().length);
    if (secaoAtual.titulo || possuiConteudo) {
      secoes.push({
        titulo: secaoAtual.titulo,
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
    return [
      {
        titulo: "Letra",
        linhas: linhas,
      },
    ];
  }

  return secoes;
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
