/**
 * Representação de linhas cifradas, cada linha
 * que contém cifra em cima são contadas como
 * linhas cifradas. Linhas que não têm cifra são linhas
 * estáticas
 */
class Cifra {
  constructor({
    afinacao,
    linha,
    linhaCifra,
    linhaUmLetra,
    linhaDoisLetra,
    fimParagrafo,
  }) {
    // Linha onde fica a tablatura, permite que seja ordenada juntamento com as cifras
    this.linha = linha || 0;
    this.afinacao = afinacao;
    this.linhaCifraOriginal = linhaCifra || "";
    this.linhaCifra = linhaCifra || "";
    this.linhaCifraMobile = linhaCifra || "";
    this.linhaUmLetra = linhaUmLetra || "";
    this.linhaDoisLetra = linhaDoisLetra || "";
    this.linhaUmLetraMobile = linhaUmLetra || "";
    this.linhaDoisLetraMobile = linhaDoisLetra || "";
    this.fimParagrafo = fimParagrafo || false;
  }

  static extrairDaCifra(afinacao, cifra) {
    let cifras = [];
    const cifraByLine = cifra.split("\n"),
      regexLinhaTexto = new RegExp(
        /[1-9A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ:" ]+/,
        "gi"
      ),
      regexLinhaEmBranco = new RegExp(/^\s*$/, "gm");

    const normalizeChord = (value) => {
      const sanitized = value.replace(/\s+/g, "").replace(/[()]/g, "");
      if (!sanitized) {
        return "";
      }

      const parts = sanitized.split("/");

      const formatPart = (part) => {
        const match = part.match(/^([A-Ga-g])([#b]?)(.*)$/);

        if (!match) {
          return part;
        }

        const [, note, accidental = "", suffix = ""] = match;
        return `${note.toUpperCase()}${accidental}${suffix}`;
      };

      return parts.map(formatPart).join("/");
    };

    if (!this.acordesNormalizados) {
      this.acordesNormalizados = new Set(
        acordes.map((acorde) => normalizeChord(acorde))
      );
    }

    const notaRegex = "[A-G](?:#|b)?";
    const qualificadorRegex =
      "(?:add|sus|maj|min|dim|aug|m|M|dom|alt|omit|no|[#b+°º-]|\\d+)";
    const strictChordRegex = new RegExp(
      `^${notaRegex}(?:${qualificadorRegex})*(?:/${notaRegex}(?:${qualificadorRegex})*)*$`,
      "i"
    );

    const isAcordeValido = (tokens) => {
      if (!tokens.length) {
        return false;
      }

      let acordesIdentificados = 0;

      const allTokensValid = tokens.every((token) => {
        const trimmedToken = token.trim();
        if (!trimmedToken.length) {
          return false;
        }

        const normalizedToken = normalizeChord(trimmedToken);
        if (!normalizedToken) {
          return false;
        }
        const isKnownChord = this.acordesNormalizados.has(normalizedToken);
        const matchesStrictRegex = strictChordRegex.test(normalizedToken);

        if (isKnownChord || matchesStrictRegex) {
          acordesIdentificados++;
          return true;
        }

        return false;
      });

      return allTokensValid && acordesIdentificados > 0;
    };

    const isLinhaCifra = (linha) => {
      const tokens = linha.trim().split(/\s+/).filter(Boolean);
      return isAcordeValido(tokens);
    };

    const isLinhaBranco = (linha) => Boolean(linha.match(regexLinhaEmBranco));

    const isLinhaTexto = (linha) => Boolean(linha.match(regexLinhaTexto));

    let linhaLida = 0;
    cifraByLine.forEach((linha, index) => {
      // Cada cifra pode começar com texto ou cifra, mas sempre termina em uma cifra ou espaço em branco

      if (index > linhaLida) {
        let cifra = new Cifra({ afinacao, linha: index });
        let i = 0,
          encontrouFim = false;

        if (isLinhaCifra(linha)) {
          // Verifica se é uma linhaCifra, a cifra só pode estar na primeira linha de um objeto Cifra
          cifra.linhaCifra = linha;
          cifra.linhaCifraOriginal = linha;
        }

        while (encontrouFim === false) {
          if (
            cifraByLine[index + i] &&
            typeof cifraByLine[index + i] !== "undefined" &&
            !isLinhaCifra(cifraByLine[index + i]) &&
            isLinhaTexto(cifraByLine[index + i])
          ) {
            if (!cifra.linhaUmLetra) {
              cifra.linhaUmLetra = cifraByLine[index + i];
            } else if (cifra.linhaUmLetra && !cifra.linhaDoisLetra) {
              cifra.linhaDoisLetra = cifraByLine[index + i];
            } else {
              encontrouFim = true;
              break;
            }
          }

          if (
            typeof cifraByLine[index + i] !== "undefined" &&
            !isLinhaCifra(cifraByLine[index + i]) &&
            isLinhaBranco(cifraByLine[index + i])
          ) {
            cifra.fimParagrafo = true;
            encontrouFim = true;
            break;
          }

          if (
            i !== 0 &&
            cifraByLine[index + i] &&
            typeof cifraByLine[index + i] !== "undefined" &&
            isLinhaCifra(cifraByLine[index + i])
          ) {
            encontrouFim = true;
            break;
          }

          if (index + i >= cifraByLine.length) {
            encontrouFim = true;
            break;
          }

          i++;
        }

        linhaLida = index + (i - 1);
        if (cifra.linhaCifra || cifra.linhaUmLetra) cifras.push(cifra);
      }
    });

    return cifras;
  }

  render(modo = "desktop", caracteresPorLinha = 32) {
    let html = "";
    if (modo === "desktop") {
      if (this.linhaCifra) {
        let tmpCifraHtml = this.linhaCifra.replace(
          new RegExp(/[ABCDEFG]([\w#()]{1,7})?/, "g"),
          (string) => `<span class='cifra'>${string}</span>`
        );
        html += `${tmpCifraHtml}\n`;
      }
      if (this.linhaUmLetra.length) {
        html += `${this.linhaUmLetra}\n`;
      }
      if (this.linhaDoisLetra.length) {
        html += `${this.linhaDoisLetra}\n`;
      }
      if (this.fimParagrafo) {
        html += `\n\n`;
      }
    } else if (modo === "mobile") {
      const divisaoPartes = (string) => {
        let startIndex = 0,
          index = 0,
          indexes = [];
        index += caracteresPorLinha;
        let regex = /\S+/gi,
          result,
          results = [];
        while ((result = regex.exec(string))) {
          results.push({ string: result[0], index: result.index });
        }
        results.forEach((match, i) => {
          if (
            match.index < index &&
            match.index + match.string.length > index
          ) {
            // Se a palavra quebra no meio do ponto de corte
            indexes.push([startIndex, match.index + match.string.length]);
            startIndex = match.index + match.string.length;
            index = startIndex + caracteresPorLinha;
            if (index > string.length && startIndex < string.length) {
              indexes.push([startIndex, string.length]);
            }
          } else if (
            match.index + match.string.length > index &&
            match.index >= index
          ) {
            // Se já tiver passado para a outra quebra de linha
            indexes.push([startIndex, match.index + match.string.length]);
            startIndex = match.index + match.string.length;
            index = startIndex + caracteresPorLinha;
            if (index > string.length && startIndex < string.length) {
              indexes.push([startIndex, string.length]);
            }
          } else if (i + 1 == results.length) {
            // Última palavra
            if (
              indexes[0] &&
              indexes[indexes.length - 1][1] !== string.length
            ) {
              indexes.push([startIndex, string.length]);
            } else if (!indexes[0]) {
              indexes.push([startIndex, string.length]);
            }
          }
        });
        return indexes;
      };

      const divisaoPartesLetraUm = divisaoPartes(this.linhaUmLetra),
        divisaoPartesLetraDois = divisaoPartes(this.linhaDoisLetra),
        divisaoPartesCifra = divisaoPartes(this.linhaCifra),
        divisaoPartesLetraCifra = [
          divisaoPartesLetraUm,
          divisaoPartesLetraDois,
          divisaoPartesCifra,
        ];

      let partesMaiores = divisaoPartesLetraUm;
      if (divisaoPartesLetraDois.length > partesMaiores.length) {
        partesMaiores = divisaoPartesLetraDois;
      }
      if (divisaoPartesCifra.length > partesMaiores.length) {
        partesMaiores = divisaoPartesCifra;
      }

      this.linhaCifraMobile = [];
      this.linhaUmLetraMobile = [];
      this.linhaDoisLetraMobile = [];

      partesMaiores.forEach((_, index) => {
        if (divisaoPartesLetraCifra[2][index]) {
          this.linhaCifraMobile.push(
            this.linhaCifra.substring(
              divisaoPartesLetraCifra[0][index]
                ? divisaoPartesLetraCifra[0][index][0]
                : divisaoPartesLetraCifra[2][index][0],
              divisaoPartesLetraCifra[0][index]
                ? divisaoPartesLetraCifra[0][index][1]
                : divisaoPartesLetraCifra[2][index][1]
            )
          );
        }

        if (divisaoPartesLetraCifra[0][index]) {
          this.linhaUmLetraMobile.push(
            this.linhaUmLetra.substring(
              divisaoPartesLetraCifra[0][index][0],
              divisaoPartesLetraCifra[0][index][1]
            )
          );
        }

        if (divisaoPartesLetraCifra[1][index]) {
          this.linhaDoisLetraMobile.push(
            this.linhaDoisLetra.substring(
              divisaoPartesLetraCifra[1][index][0],
              divisaoPartesLetraCifra[1][index][1]
            )
          );
        }
      });

      // Renderizando
      for (let i = 0; i < partesMaiores.length; i++) {
        if (this.linhaCifraMobile[i]) {
          let tmpCifraHtml = this.linhaCifraMobile[i].replace(
            new RegExp(/[ABCDEFG]([\w#()]{1,7})?/, "g"),
            "<span class='cifra'>$&</span>"
          );
          html += `${tmpCifraHtml}\n`;
          // console.log(this.linhaCifraMobile[i]);
        }
        // console.log(this.linhaLetraMobile[i]);
        if (this.linhaUmLetraMobile[i]) {
          html += `${this.linhaUmLetraMobile[i]}\n`;
        }
        if (this.linhaDoisLetraMobile[i]) {
          html += `${this.linhaDoisLetraMobile[i]}\n`;
        }
      }
      if (this.fimParagrafo) {
        html += `\n\n`;
      }
    }

    // console.log(this.linhaCifraMobile, this.linhaLetraMobile);

    return html;
  }

  static alteraNota = (nota, variacaoTom) => {
    // Captura nota e vê o índice dela
    const notaIndex = dicionarioNotas[nota],
      // Verifica o tom que está para indicar as notas que pertencem a esse tom
      tom = appState.tom,
      padroesTom = {
        maior: [0, 2, 4, 5, 7, 9, 11],
        menor: [0, 2, 3, 5, 7, 8, 11],
      },
      padraoTom = tom.includes("m") ? padroesTom["menor"] : padroesTom["maior"];

    let ordemNotas = ["C", "D", "E", "F", "G", "A", "B"];

    // Reordenando `ordemNotas` com base no tom atual
    let tmpOrdemNotas = [...ordemNotas];
    // Verifica qual a primeira nota da ordem
    tmpOrdemNotas[0] = tom.match(RegExp(/[ABCDEFG]/))[0];
    // Verifica em que index da ordem está essa nota
    let index0 = ordemNotas.findIndex((nota) => nota === tmpOrdemNotas[0]);
    const getIndexNota = (index) => {
      return index >= 7 ? index - 7 : index < 0 ? index + 7 : index;
    };
    // Adicionando demais notas na ordem
    for (let i = 1; i < 7; i++) {
      tmpOrdemNotas[i] = ordemNotas[getIndexNota(index0 + i)];
    }

    ordemNotas = [...tmpOrdemNotas];

    /** Função que ajusta o index caso passe das 12 notas */
    const getIndexSemitom = (index) => {
      return index > 12 ? index - 12 : index <= 0 ? index + 12 : index;
    };

    let notasPreferenciais = [];
    for (let i = 0; i < 7; i++) {
      let notaAtual = Object.entries(dicionarioNotas).filter((notaBuscada) => {
        return (
          notaBuscada[0].includes(ordemNotas[i]) &&
          notaBuscada[1] ===
            getIndexSemitom(dicionarioNotas[tom] + padraoTom[i])
        );
      })[0];
      notasPreferenciais[i] = notaAtual[0];
    }

    let notaAtual = Object.entries(dicionarioNotas).filter((notaBuscada) => {
      return notaBuscada[1] === getIndexSemitom(notaIndex + variacaoTom);
    });

    if (notaAtual.length === 1) {
      return notaAtual[0][0];
    } else {
      let notaPreferencial = notaAtual.filter((notaBuscada) =>
        notasPreferenciais.includes(notaBuscada[0])
      );
      if (notaPreferencial.length > 0) {
        return notaPreferencial[0][0];
      } else {
        console.log(nota, notaAtual, notaIndex + variacaoTom);
        return notaAtual[0][0];
      }
    }
  };

  alterarTom() {
    const numeroTomOriginal = dicionarioTons[appState.tomOriginal],
      numeroTomAtual = dicionarioTons[appState.tom],
      variacaoTom = numeroTomAtual - numeroTomOriginal;

    const regexNotaIndividual = new RegExp(
      /(Ab|A#|A|Bb|B#|B|Cb|C#|C|Db|D#|D|Eb|E#|E|Fb|F#|F|Gb|G#|G|A)/,
      "g"
    );

    this.linhaCifra = this.linhaCifraOriginal;
    this.linhaCifra = this.linhaCifra.replace(regexNotaIndividual, (m) =>
      Cifra.alteraNota(m, variacaoTom)
    );
  }
}
