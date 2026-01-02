/**
 * Representação de linhas cifradas, cada linha
 * que contém cifra em cima são contadas como
 * linhas cifradas. Linhas que não têm cifra são linhas
 * estáticas
 */
class Cifra {
  constructor({ linha, linhaCifra, linhaUmLetra, linhaDoisLetra, fimParagrafo }) {
    this.linha = linha || 0;
    this.linhaCifraOriginal = linhaCifra || "";
    this.linhaCifra = linhaCifra || "";
    this.linhaCifraMobile = linhaCifra || "";
    this.linhaUmLetraOriginal = linhaUmLetra || "";
    this.linhaUmLetra = linhaUmLetra || "";
    this.linhaDoisLetraOriginal = linhaDoisLetra || "";
    this.linhaDoisLetra = linhaDoisLetra || "";
    this.linhaUmLetraMobile = linhaUmLetra || "";
    this.linhaDoisLetraMobile = linhaDoisLetra || "";
    this.fimParagrafo = fimParagrafo || false;
  }

  static normalizarAcorde(valor) {
    const sanitized = valor.replace(/\s+/g, "").replace(/[()]/g, "");
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
  }

  static garantirDicionarios() {
    if (!Cifra.acordesNormalizados) {
      Cifra.acordesNormalizados = new Set(
        acordes.map((acorde) => Cifra.normalizarAcorde(acorde))
      );
    }

    if (!Cifra.strictChordRegex) {
      const notaRegex = "[A-G](?:#|b)?";
      const qualificadorRegex =
        "(?:add|sus|maj|min|dim|aug|m|M|dom|alt|omit|no|[#b+°º-]|\\d+)";
      Cifra.strictChordRegex = new RegExp(
        `^${notaRegex}(?:${qualificadorRegex})*(?:/${notaRegex}(?:${qualificadorRegex})*)*$`,
        "i"
      );
    }
  }

  static isAcordeValido(tokens) {
    if (!tokens.length) {
      return false;
    }

    Cifra.garantirDicionarios();
    let acordesIdentificados = 0;

    const allTokensValid = tokens.every((token) => {
      const trimmedToken = token.trim();
      if (!trimmedToken.length) {
        return false;
      }

      const normalizedToken = Cifra.normalizarAcorde(trimmedToken);
      if (!normalizedToken) {
        return false;
      }

      const isKnownChord = Cifra.acordesNormalizados.has(normalizedToken);
      const matchesStrictRegex = Cifra.strictChordRegex.test(normalizedToken);

      if (isKnownChord || matchesStrictRegex) {
        acordesIdentificados++;
        return true;
      }

      return false;
    });

    return allTokensValid && acordesIdentificados > 0;
  }

  static isLinhaCifra(linha) {
    const tokens = linha.trim().split(/\s+/).filter(Boolean);
    return Cifra.isAcordeValido(tokens);
  }

  static extrairDaCifra(cifra) {
    let cifras = [];
    const cifraByLine = cifra.split("\n"),
      regexLinhaTexto = new RegExp(
        /[1-9A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ:" ]+/, "gi"
      ),
      regexLinhaEmBranco = new RegExp(/^\s*$/, "gm");

    const isLinhaBranco = (linha) => Boolean(linha.match(regexLinhaEmBranco));

    const isLinhaTexto = (linha) => Boolean(linha.match(regexLinhaTexto));

    let linhaLida = 0;
    cifraByLine.forEach((linha, index) => {
      if (index > linhaLida) {
        let cifra = new Cifra({ linha: index });
        let i = 0,
          encontrouFim = false;

        if (Cifra.isLinhaCifra(linha)) {
          cifra.linhaCifra = linha;
          cifra.linhaCifraOriginal = linha;
        }

        while (encontrouFim === false) {
          if (
            cifraByLine[index + i] &&
            typeof cifraByLine[index + i] !== "undefined" &&
            !Cifra.isLinhaCifra(cifraByLine[index + i]) &&
            isLinhaTexto(cifraByLine[index + i])
          ) {
            if (!cifra.linhaUmLetra) {
              cifra.linhaUmLetra = cifraByLine[index + i];
              cifra.linhaUmLetraOriginal = cifra.linhaUmLetra;
            } else if (cifra.linhaUmLetra && !cifra.linhaDoisLetra) {
              cifra.linhaDoisLetra = cifraByLine[index + i];
              cifra.linhaDoisLetraOriginal = cifra.linhaDoisLetra;
            } else {
              encontrouFim = true;
              break;
            }
          }

          if (
            typeof cifraByLine[index + i] !== "undefined" &&
            !Cifra.isLinhaCifra(cifraByLine[index + i]) &&
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
            Cifra.isLinhaCifra(cifraByLine[index + i])
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
    
    const formatLine = (line) => {
      if (!line) return "";
      const titleMatch = line.match(/^\[(.+)\]$/);
      if (titleMatch) {
        return `<span class="cifra-section-title">${titleMatch[1]}</span>\n`;
      }
      return `${line}\n`;
    };

    if (modo === "desktop") {
      if (this.linhaCifra) {
        let tmpCifraHtml = this.linhaCifra.replace(
          new RegExp(/[ABCDEFG]([\w#()+-]{1,7})?/, "g"),
          (string) => `<span class='cifra'>${string}</span>`
        );
        html += `${tmpCifraHtml}\n`;
      }
      if (this.linhaUmLetra.length) {
        html += formatLine(this.linhaUmLetra);
      }
      if (this.linhaDoisLetra.length) {
        html += formatLine(this.linhaDoisLetra);
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
            indexes.push([startIndex, match.index + match.string.length]);
            startIndex = match.index + match.string.length;
            index = startIndex + caracteresPorLinha;
            if (index > string.length && startIndex < string.length) {
              indexes.push([startIndex, string.length]);
            }
          } else if (i + 1 == results.length) {
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

      for (let i = 0; i < partesMaiores.length; i++) {
        if (this.linhaCifraMobile[i]) {
          let tmpCifraHtml = this.linhaCifraMobile[i].replace(
            new RegExp(/[ABCDEFG]([\w#()+-]{1,7})?/, "g"),
            "<span class='cifra'>$&</span>"
          );
          html += `${tmpCifraHtml}\n`;
        }
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

    return html;
  }

  static alteraNota = (nota, variacaoTom) => {
    const notaIndex = dicionarioNotas[nota],
      tom = appState.tom,
      padroesTom = {
        maior: [0, 2, 4, 5, 7, 9, 11],
        menor: [0, 2, 3, 5, 7, 8, 11],
      },
      padraoTom = tom.includes("m") ? padroesTom["menor"] : padroesTom["maior"];

    let ordemNotas = ["C", "D", "E", "F", "G", "A", "B"];

    let tmpOrdemNotas = [...ordemNotas];
    tmpOrdemNotas[0] = tom.match(RegExp(/[ABCDEFG]/))[0];
    let index0 = ordemNotas.findIndex((nota) => nota === tmpOrdemNotas[0]);
    const getIndexNota = (index) => {
      return index >= 7 ? index - 7 : index < 0 ? index + 7 : index;
    };
    for (let i = 1; i < 7; i++) {
      tmpOrdemNotas[i] = ordemNotas[getIndexNota(index0 + i)];
    }

    ordemNotas = [...tmpOrdemNotas];

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

    const chordLine = this.linhaCifraOriginal || "";
    const chordChars = Array.from(chordLine);
    const lyricOneChars = this.linhaUmLetraOriginal
      ? Array.from(this.linhaUmLetraOriginal)
      : [];
    const lyricTwoChars = this.linhaDoisLetraOriginal
      ? Array.from(this.linhaDoisLetraOriginal)
      : [];

    const ensureLength = (array, targetLength) => {
      if (!array) {
        return;
      }
      while (array.length < targetLength) {
        array.push(" ");
      }
    };

    const findInsertPosition = (array, position) => {
      if (!array || array.length === 0) {
        return 0;
      }
      if (position >= array.length) {
        return array.length;
      }
      for (let i = position; i < array.length; i++) {
        if (array[i] === " ") {
          return i;
        }
      }
      return array.length;
    };

    const insertSpaces = (array, position, count) => {
      if (!array || count <= 0) {
        return;
      }
      ensureLength(array, position);
      const insertPosition = findInsertPosition(array, position);
      const spaces = new Array(count).fill(" ");
      array.splice(insertPosition, 0, ...spaces);
    };

    const chordTokens = [...chordLine.matchAll(/\S+/g)];
    let offset = 0;

    chordTokens.forEach((token, index) => {
      const originalStart = token.index || 0;
      const start = originalStart + offset;
      const originalChord = token[0];
      const transposedChord = originalChord.replace(
        regexNotaIndividual,
        (nota) => Cifra.alteraNota(nota, variacaoTom)
      );

      const diff = transposedChord.length - originalChord.length;
      const replacement = [
        ...transposedChord.split(""),
        ...new Array(Math.max(0, -diff)).fill(" "),
      ];

      chordChars.splice(start, originalChord.length, ...replacement);

      if (diff > 0) {
        const shiftPosition = start + originalChord.length;
        insertSpaces(lyricOneChars, shiftPosition, diff);
        insertSpaces(lyricTwoChars, shiftPosition, diff);
        offset += diff;
      }

      const end = start + replacement.length;
      const nextToken = chordTokens[index + 1];
      if (nextToken) {
        const nextStart = (nextToken.index || 0) + offset;
        const gap = nextStart - end;
        if (gap < 1) {
          const spacesToInsert = 1 - gap;
          const spaces = new Array(spacesToInsert).fill(" ");
          chordChars.splice(end, 0, ...spaces);
          insertSpaces(lyricOneChars, end, spacesToInsert);
          insertSpaces(lyricTwoChars, end, spacesToInsert);
          offset += spacesToInsert;
        }
      }
    });

    const joinAndTrim = (chars) =>
      chars.length ? chars.join("").replace(/\s+$/, "") : "";

    this.linhaCifra = joinAndTrim(chordChars);
    this.linhaUmLetra = this.linhaUmLetraOriginal
      ? joinAndTrim(lyricOneChars)
      : this.linhaUmLetraOriginal;
    this.linhaDoisLetra = this.linhaDoisLetraOriginal
      ? joinAndTrim(lyricTwoChars)
      : this.linhaDoisLetraOriginal;
  }
}
