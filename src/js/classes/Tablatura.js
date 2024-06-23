class Tablatura {
  constructor({ afinacao, notacoes, tablaturaString, linha }) {
    // Linha onde fica a tablatura, permite que seja ordenada juntamento com as cifras
    this.linha = linha || 0;
    // Afinação que define a ordem das cordas iniciais de criação
    this.afinacao = afinacao;
    this.afinacaoOriginal = afinacao;
    this.cordas = afinacao.cordas;
    // Notações organizadas por tempo e cordas, as linhas são na verdade em colunas seguindo a sequencia das cordas da presente afinação
    this.notacoes = notacoes || [];
    this.notacoesOriginaisAfinacao = [];
    // Raw da tablatura como extraída. Útil para análise e substituição ao trocar de tom ou afinação
    this.tablaturaString = tablaturaString || [];
    this.tablaturaStringOriginal = tablaturaString || [];

    this.init();
  }

  init() {
    this.tablaturaStringOriginal = this.tablaturaString;
    this.notacoesOriginais = this.notacoes;
  }

  alterarAfinacao(apelidoAfinacao, PREMIUM = appState.premium) {
    const afinacao = afinacoesPorApelido[apelidoAfinacao];

    // restaura tom original
    appState.tom = appState.tomOriginal;
    $("#tom").val(appState.tom);
    if (apelidoAfinacao !== appState.afinacaoOriginal) {
      afinacao.cordas.forEach((corda, cordaIndex) => {
        const numeroNotaAnterior =
            dicionarioNotas[this.afinacao.cordas[cordaIndex].nota.notacao],
          numeroNotaAtual = dicionarioNotas[corda.nota.notacao],
          variacaoNota = numeroNotaAtual - numeroNotaAnterior;

        this.notacoesOriginaisAfinacao.forEach((notacao, i, a) => {
          if (notacao.cordaIndex === cordaIndex) {
            // Caso coincida a corda, troca a nota
            if (!notacao.estatico && PREMIUM) {
              const notacoes = notacao.notacoes.map((n) => {
                let valor = n.valor;
                if (n.tipo === "nota") {
                  if (
                    parseInt(valor) + variacaoNota >= 0 &&
                    parseInt(valor) + variacaoNota <=
                      this.cordas[notacao.cordaIndex].limiteDeCasas
                  ) {
                    // Caso a nota esteja dentro das casas do braço
                    valor = String(parseInt(valor) + variacaoNota);
                  } else if (parseInt(valor) + variacaoNota < 0) {
                    // Caso o valor esteja abaixo da linha do traste
                    // A nota alvo é dada pela verificação da corda
                    let notaAlvo =
                      this.cordas[notacao.cordaIndex].nota.numero +
                      variacaoNota;
                    notaAlvo = new Nota(
                      Object.entries(dicionarioTons).filter(
                        (tom) => tom[1] === notaAlvo
                      )[0][0]
                    );
                    // Sobe uma oitava
                    valor = String(
                      notaAlvo.numero -
                        this.cordas[notacao.cordaIndex].nota.numero +
                        12
                    );
                  } else if (
                    parseInt(valor) + variacaoNota >
                    this.cordas[notacao.cordaIndex].limiteDeCasas
                  ) {
                    // Caso o valor esteja acima do limite das casas do braço
                    valor = String(parseInt(valor) + variacaoTom - 12);
                  }
                }
                return { ...n, valor };
              });

              const match = notacoes
                .reduce((acc, cur) => [...acc, cur.valor], [])
                .join("");
              a[i] = new Notacao({
                ...notacao,
                match,
                print: match,
                notacoes,
                length: match.length,
              });
            } else {
              a[i] = new Notacao({
                ...notacao,
              });
            }
          }
        });
      });
    }

    this.afinacao = afinacao;
    this.cordas = this.afinacao.cordas;
    // Caso a afinação selecionada seja a mesma da original, apenas restirui os parâmetros iniciais em vez de modular
    if (apelidoAfinacao === appState.afinacaoOriginal) {
      let notacoesOriginaisCopy = [];
      this.notacoesOriginais.forEach((notacao) => {
        notacoesOriginaisCopy.push(
          new Notacao({
            ...notacao,
            notacoes: [...notacao.notacoes],
          })
        );
      });
      this.notacoes = notacoesOriginaisCopy;
      this.notacoesOriginaisAfinacao = notacoesOriginaisCopy;
      this.notacoes = this.notacoesOriginaisAfinacao;
    } else {
      this.notacoes = this.notacoesOriginaisAfinacao;
    }
    console.log("Afinação trocada", this);
  }

  alterarTom(PREMIUM = appState.premium) {
    const numeroTomOriginal = dicionarioTons[appState.tomOriginal],
      numeroTomAtual = dicionarioTons[appState.tom],
      variacaoTom = numeroTomAtual - numeroTomOriginal;

    let notacoesAtuais = [];
    this.notacoesOriginaisAfinacao.forEach((notacao) => {
      notacoesAtuais.push({ ...notacao, notacoes: [...notacao.notacoes] });
    });

    notacoesAtuais.forEach((notacao, i, a) => {
      if (!notacao.estatico) {
        if (PREMIUM) {
          const notacoes = notacao.notacoes.map((n) => {
            let valor = n.valor;
            if (n.tipo === "nota") {
              if (
                parseInt(valor) + variacaoTom >= 0 &&
                parseInt(valor) + variacaoTom <=
                  this.cordas[notacao.cordaIndex].limiteDeCasas
              ) {
                // Caso a nota esteja dentro das casas do braço
                valor = String(parseInt(valor) + variacaoTom);
              } else if (parseInt(valor) + variacaoTom < 0) {
                // Caso o valor esteja abaixo da linha do traste
                // A nota alvo é dada pela verificação da corda e da variacao do tom
                let notaAlvo =
                  this.cordas[notacao.cordaIndex].nota.numero +
                  parseInt(valor) +
                  variacaoTom;
                // Mas esse valor pode dar zero, sendo que as notas começam em 1 e terminam em 12, logo:
                if (notaAlvo <= 0) notaAlvo = 12 + notaAlvo;
                if (notaAlvo > 12) notaAlvo = notaAlvo - 12;
                notaAlvo = new Nota(
                  Object.entries(dicionarioTons).filter(
                    (tom) => tom[1] === notaAlvo
                  )[0][0]
                );
                // Sobe uma oitava
                valor =
                  notaAlvo.numero -
                  this.cordas[notacao.cordaIndex].nota.numero +
                  12;
                if (valor > this.cordas[notacao.cordaIndex].limiteDeCasas)
                  valor -= 12;
                valor = String(valor);
              } else if (
                parseInt(valor) + variacaoTom >
                this.cordas[notacao.cordaIndex].limiteDeCasas
              ) {
                // Caso o valor esteja acima do limite das casas do braço
                valor = String(parseInt(valor) + variacaoTom - 12);
              }
            }
            return { ...n, valor };
          });

          const match = notacoes
            .reduce((acc, cur) => [...acc, cur.valor], [])
            .join("");
          a[i] = new Notacao({
            ...notacao,
            match,
            print: match,
            notacoes,
            length: match.length,
          });
        }
      } else {
        if (notacao.match.match(new RegExp(/\(\D+\)/))) {
          // Convertendo notas dentro da tablatura
          let nota = notacao.match.match(new RegExp(/\(\D+\)/))[0];
          nota = nota.replace(/\(|\)/g, "");
          console.log(nota);
          let printString = Cifra.alteraNota(nota, variacaoTom);
          a[i] = new Notacao({
            ...notacao,
            print:
              `(${printString})` ||
              notacao.print,
          });
        }
        a[i] = new Notacao({
          ...notacao,
        });
      }
    });

    this.notacoes = notacoesAtuais;

    console.log(
      `Tom trocado. Tom original: ${appState.tomOriginal}, Tom novo: ${appState.tom}, variação de notas: ${variacaoTom}`
    );
  }

  /**
   * Método estático que renderiza as tablaturas
   * Para utilizar a quebra de tablatura, utilizar o
   * modo='mobile'
   */
  render(modo = "desktop", colunasPorLinha = 12) {
    /**
     * Foi solicitado que, se tivessem duas notações numa mesma coluna
     * com slides, sendo que as notações possuissem quantidade de dígitos
     * diferentes, a barra deveria ser centralizada, ou seja:
     * 9/12  >>>  9/12
     * 11/14 >>> 11/14
     * @param {array} coluna
     */
    const alinhamentoSlides = (coluna) => {
      let matchIndex = null,
        deveAlinhar = false,
        newColuna = [];
      coluna.forEach((linha) => {
        const match = linha.match.match(/\/|s/);
        if (match && matchIndex !== null && matchIndex !== match.index) {
          deveAlinhar = true;
        }
        if (match) matchIndex = match.index;
      });
      if (deveAlinhar) {
        // Verifica qual das notações tem o maior length, assim, todos devem se pasear nele
        const biggerLength = coluna.sort((a, b) =>
          a.length < b.length ? 1 : b.length < a.length ? -1 : 0
        )[0].length;
        coluna.forEach((notacao) => {
          newColuna.push(
            new Notacao({
              ...notacao,
              notacoes: [...notacao.notacoes],
              print: notacao.match.padStart(biggerLength, "-"),
            })
          );
        });
      }
      return newColuna.length ? newColuna : coluna;
    };

    let notacoesAtuaisEmColunas = {};
    // Verificando qual a ultima coluna
    let ultimaColuna = this.notacoes[this.notacoes.length - 1].ordem;
    // Visualizando as notações por colunas
    for (let i = 0; i <= ultimaColuna; i++) {
      let coluna = this.notacoes.filter((notacao) => notacao.ordem === i);

      if (coluna.length) {
        notacoesAtuaisEmColunas[i] = coluna;
      }
    }

    /**
     * Se tiver na coluna um hammer-on ou pull-off
     * analisa se estão adequadamente posicionados, isto é,
     * 5h2 está errado pois o hammer-on é sempre do menor
     * para o maior e 2p5 está também errado pelo raciocínio
     * inverso
     */
    const hammerOnPullOff = (coluna) => {
      let newColuna = [];
      coluna.forEach((notacao) => {
        if (notacao.match.match(new RegExp(/(\d+p\d+)|(\d+h\d+)/, "g"))) {
          // Analisa se a notação está correta
          const numberArray = notacao.match.split(/\D/);
          let print = notacao.print;
          if (parseInt(numberArray[0]) > parseInt(numberArray[1])) {
            print = print.replace(/\D/, "p");
          } else {
            print = print.replace(/\D/, "h");
          }

          newColuna.push(
            new Notacao({
              ...notacao,
              print,
              notacoes: [...notacao.notacoes],
            })
          );
        } else {
          newColuna.push(
            new Notacao({
              ...notacao,
              notacoes: [...notacao.notacoes],
            })
          );
        }
      });
      return newColuna;
    };

    // Zerando a tablatura
    let tablaturaString = [],
      tablaturaStringMobile = [];
    Object.values(notacoesAtuaisEmColunas).forEach((coluna, colunaIndex) => {
      coluna = Afinacao.notasTocaveis(this.afinacao, coluna);
      coluna = hammerOnPullOff(coluna);
      coluna = alinhamentoSlides(coluna);
      // Verifica qual a notacao de maior tamanho
      let biggerLength = 0;
      coluna.forEach((linha) => {
        if (linha.length > biggerLength) biggerLength = linha.length;
      });
      // Organizando as colunas por linhas
      let notacaoCordas = coluna.reduce(
        (acc, cur) => ({ ...acc, [cur.cordaIndex]: cur }),
        {}
      );

      // Criando strings de renderização inteiras
      this.cordas.forEach((corda, cordaIndex) => {
        let string;
        if (tablaturaString[cordaIndex]) {
          string = tablaturaString[cordaIndex];
        } else {
          string = `${corda.nota.notacao.padStart(2, " ")}|-`;
        }
        if (notacaoCordas[cordaIndex]) {
          // console.log(notacaoCordas[cordaIndex])
          string = `${string}${notacaoCordas[cordaIndex].print.padEnd(
            biggerLength,
            notacaoCordas[cordaIndex].estatico ? " " : "-"
          )}${notacaoCordas[cordaIndex].estatico ? " " : "-"}`;
        } else {
          // Não tem nenhuma notação no registro dessa corda, nessa coluna
          const temEstaticoNaColuna = coluna.filter(
            (notacao) => notacao.estatico === true
          ).length;
          string = `${string}${"".padEnd(
            biggerLength,
            temEstaticoNaColuna ? " " : "-"
          )}${temEstaticoNaColuna ? " " : "-"}`;
        }
        tablaturaString[cordaIndex] = string;
      });

      // Criando blocos de strings para quebra em renderização mobile
      this.cordas.forEach((corda, cordaIndex) => {
        let string;
        const indexLinhaQuebrada =
          Math.ceil((colunaIndex + 1) / colunasPorLinha) - 1;

        if (!tablaturaStringMobile[indexLinhaQuebrada])
          tablaturaStringMobile[indexLinhaQuebrada] = [];

        if (tablaturaStringMobile[indexLinhaQuebrada][cordaIndex]) {
          string = tablaturaStringMobile[indexLinhaQuebrada][cordaIndex];
        } else {
          string = `${corda.nota.notacao.padStart(2, " ")}|-`;
        }

        if (notacaoCordas[cordaIndex]) {
          string = `${string}${notacaoCordas[cordaIndex].print.padEnd(
            biggerLength,
            "-"
          )}-`;
        } else {
          string = `${string}${"".padEnd(biggerLength, "-")}-`;
        }

        tablaturaStringMobile[indexLinhaQuebrada][cordaIndex] = string;
      });
    });

    this.tablaturaString = tablaturaString;
    this.tablaturaStringMobile = tablaturaStringMobile;

    let html = "";
    if (modo === "desktop") {
      this.tablaturaString.forEach((linha, linhaIndex) => {
        if (!linhaIndex) html += `<span data-tablatura="${this.index}">`;
        html += `${linha}\n`;
      });
      html += "</span>";
    } else if (modo === "mobile") {
      this.tablaturaStringMobile.forEach((bloco, blocoIndex) => {
        bloco.forEach((linha, linhaIndex) => {
          if (!linhaIndex)
            html += `<span data-tablatura="${this.index}" data-bloco="${blocoIndex}">`;
          html += `${linha}\n`;
        });
        html += "</span>\n";
      });
    } else {
      $("#tablaturas").append(
        "Modo de renderização de tablaturas não reconhecido"
      );
    }
    html += "\n\n";

    $("#tablaturas").append(html);

    return html;
  }

  /**
   * Extrair linhas de tablatura da cifra. O tom original de
   * toda cifra é considerado como Mi. Pois todos os exemplos passados
   * para construção desse script tiveram esse teor
   *
   * @param {Afinacao} afinacao afinação em que a cifra se encontra
   * @param {string} cifra String da cifra
   */
  static extrairDaCifra(afinacao, cifra) {
    let linhasTablatura;
    const tablaturas = [];
    const numeroCordas = afinacao.cordas.length;

    // Econtrando tablaturas
    const regexLinhaTablatura = new RegExp(/(.+)\|-(.+)/, "gi");
    linhasTablatura = cifra.match(regexLinhaTablatura);

    // Verificando e adicionando as linhas das tablaturas para seguir a ordem de renderização posteriormente
    const indexesLinhasTablatura = [];
    let match;
    while ((match = regexLinhaTablatura.exec(cifra)) != null) {
      indexesLinhasTablatura.push(match.index);
    }

    //  Verifica se o número de cordas da afinação bate com as tablaturas  da cifra
    if (linhasTablatura.length % numeroCordas !== 0) {
      console.error(
        "Há uma incompatibilidade entre o número de cordas e o número de tablaturas na cifra"
      );
    }

    let linhasTablaturaIndex = 0;
    for (let i = 0; i < linhasTablatura.length / 5; i++) {
      //  Cria array de agrupamento de cordas, formando um pacote de tablatura com cinco cordas
      const tablaturaAtual = new Tablatura({ afinacao });
      for (let j = 0; j < numeroCordas; j++) {
        //  Adiciona as notacoes às linhas
        tablaturaAtual.tablaturaString.push(
          linhasTablatura[linhasTablaturaIndex]
        );
        if (j === 0) {
          tablaturaAtual.linha = getLinhaByCharIndex(
            indexesLinhasTablatura[linhasTablaturaIndex]
          );
        }
        linhasTablaturaIndex++;
      }
      tablaturas.push(tablaturaAtual);
    }

    // lista com as notações encontradas com a ordem de quem veio primeiro
    let indexedMatches = [];
    tablaturas.forEach((tablatura, i) => {
      tablatura.index = i;
      let indexedMatchesTablatura = [];
      tablatura.tablaturaString.forEach((linha, j) => {
        // Encontrando notas numa tablatura e também textos de estrofe como "Riff 2" para que possa ser excluído
        const notacaoRegEx = new RegExp(
          /((\d+)?h(\d+)?)|((\d+)?p(\d+)?)|(\d+(~|v))|((\d+)?(\/|s)(\d+)?)|(\s+?\[.+\]\s)|\(\d+\)|(\d+)|\[.*\]|\(\D+\)/,
          "gi"
        );

        let indexes = [],
          result;
        while ((result = notacaoRegEx.exec(linha))) {
          indexes.push({
            match: result[0],
            index: result.index,
            length: result[0].length,
            cordaIndex: j,
            tablaturaIndex: i,
          });
        }
        indexedMatchesTablatura.push(indexes);
      });

      indexedMatchesTablatura = indexedMatchesTablatura
        .reduce((acc, cur) => {
          return [...acc, ...cur];
        }, [])
        .sort((a, b) => (a.index > b.index ? 1 : b.index > a.index ? -1 : 0));

      // A ordem em que os itens devem aparecer, que são, no caso as colunas de notações, ou ainda o tempo da tablatura. No tempo 0 vão as primeiras notas a serem tocadas
      let ordem = 0;
      indexedMatchesTablatura.forEach((notacao, k, arr) => {
        indexedMatchesTablatura.forEach((notacaoAnalisada, l) => {
          if (k !== l) {
            if (
              (notacaoAnalisada.index <= notacao.index + notacao.length - 1 &&
                notacaoAnalisada.index >= notacao.index) ||
              notacaoAnalisada.index === notacao.index
            ) {
              // O dedilhado das duas notações são ao mesmo tempo
              if (!notacaoAnalisada.ordem) {
                arr[l].ordem = ordem;
              }
            }
          }
        });
        if (!notacao.ordem) {
          arr[k].ordem = ordem;
          ordem++;
        }
      });

      // Separa por colunas, ou seja: "ordem"
      let orderedMatchesTablatura = [];
      for (let o = 0; o < ordem; o++) {
        orderedMatchesTablatura.push(
          indexedMatchesTablatura.filter((match) => match.ordem === o)
        );
      }

      // Retirando arrays em branco
      orderedMatchesTablatura = orderedMatchesTablatura.filter(
        (match) => match.length > 0
      );

      // Adiciona as notações com mais detalhes para que possa ser feita as alterações de notas
      indexedMatchesTablatura.forEach((notacao, i, a) => {
        const estatico =
          notacao.match.match(new RegExp(/\(\D+\)|\[.+\]/)) !== null;

        a[i] = new Notacao({
          ...notacao,
          estatico,
          notacoes: Notacao.getNotacoes(notacao),
        });
      });

      tablatura.notacoes = indexedMatchesTablatura;
      tablatura.notacoesOriginaisAfinacao = indexedMatchesTablatura;
      let notacoesOriginaisDeepCopy = [];
      indexedMatchesTablatura.forEach((notacao) => {
        notacoesOriginaisDeepCopy.push(
          new Notacao({
            ...notacao,
            notacoes: [...notacao.notacoes],
          })
        );
      });
      tablatura.notacoesOriginais = notacoesOriginaisDeepCopy;
      indexedMatches.push(indexedMatchesTablatura);
    });

    return tablaturas;
  }
}
