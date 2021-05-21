class Afinacao {
    constructor(nome, apelido, cordas) {
      this.nome = nome;
      this.apelido = apelido;
      this.cordas = cordas || [];
    }
  
    /**
     * Verifica se as notas na mesma casa são tocáveis, notas tocáveis são aquelas que estão numa distância máxima de 4 casas
     * @param {Afinacao} afinacao
     * @param {array} coluna Array de Notacao
     */
    static notasTocaveis(afinacao, coluna, distancaMaxima = 4) {
      let newColuna = [];
      if (coluna.length >= 2) {
        // Notas sendo tocadas juntas
        // console.log("----------");
        const notacoesEmColunas = [];
        // Invertendo matriz de linhas para colunas e guardando em notacoesEmColunas
        coluna.forEach((notacao, i) => {
          notacao.notacoes.forEach((detalhe, j) => {
            if (!notacoesEmColunas[j]) {
              notacoesEmColunas[j] = [];
            }
            // tempId é o Id do item da coluna que ele se encontra, para poder readicionar depois no final dos calculos
            notacoesEmColunas[j].push({ ...detalhe, tempId: i });
          });
        });
  
        notacoesEmColunas.forEach((colunaNotacaoDetalhada) => {
          if (
            colunaNotacaoDetalhada.reduce(
              (acc, cur) => acc + parseInt(cur.valor),
              0
            ) >= 0
          ) {
            // Verifica se todos os dígitos da coluna são números
            const allTheSame = (array) => {
              const elementValue = array[0].valor;
              let bool = true;
              for (let j = 1; j < array.length; j++) {
                if (parseInt(array[j].valor) !== parseInt(elementValue)) {
                  bool = false;
                  break;
                }
              }
              return bool;
            };
  
            const distanciaEntreColunas = (colunaBinaria) =>
              Math.abs(
                parseInt(colunaBinaria[0].valor) -
                  parseInt(colunaBinaria[1].valor)
              );
  
            const converterCasaParaNota = (notacaoDetalhada) => {
              console.log(notacaoDetalhada);
              const calculoBrutoNota =
                afinacao.cordas[notacaoDetalhada.cordaIndex].nota.numero +
                parseInt(notacaoDetalhada.valor);
              if (calculoBrutoNota < 12) {
                return calculoBrutoNota;
              } else {
                return calculoBrutoNota % 12;
              }
            };
  
            const encontrarNotaProximaVazia = (colunaNotacaoDetalhada) => {
              let cordasVazias = [];
              afinacao.cordas.forEach((corda, cordaIndex) => {
                if (
                  coluna.filter((notacao) => notacao.cordaIndex === cordaIndex)
                    .length === 0
                ) {
                  cordasVazias.push(corda);
                }
              });
  
              console.log(colunaNotacaoDetalhada);
              for (let i = 0; i < cordasVazias.length; i++) {
                // tem que encontrar uma corda onde a nota seja igual à converterCasaParaNota(colunaNotacaoDetalhada[1]) e a distancia para a casa colunaNotacaoDetalhada[0].valor seja menor que a distancia máxima
  
                // Convertendo uma nota para a casa onde ela fica na corda
                let casaNaCorda =
                  converterCasaParaNota(colunaNotacaoDetalhada[1]) -
                  cordasVazias[i].nota.numero;
                if (casaNaCorda < 0) {
                  casaNaCorda += 12;
                } else if (casaNaCorda > cordasVazias[i].limiteDeCasas) {
                  casaNaCorda -= 12;
                }
                // Verifica se a casa encontrada está próxima, se não tiver tenta oitavar
                if (
                  casaNaCorda <
                    parseInt(colunaNotacaoDetalhada[0].valor) - distancaMaxima &&
                  casaNaCorda + 12 < cordasVazias[i].limiteDeCasas
                ) {
                  casaNaCorda += 12;
                }
  
                // Verificando se está próximo se estiver próximas as casas para o loop, por isso o for
                if (
                  casaNaCorda >
                    colunaNotacaoDetalhada[0].valor - distancaMaxima &&
                  casaNaCorda < colunaNotacaoDetalhada[0].valor + distancaMaxima
                ) {
                  colunaNotacaoDetalhada[1] = {
                    ...colunaNotacaoDetalhada[1],
                    valor: String(casaNaCorda),
                    cordaIndex: i,
                  };
                }
              }
              console.log(colunaNotacaoDetalhada);
            };
  
            if (
              allTheSame(colunaNotacaoDetalhada) === false &&
              colunaNotacaoDetalhada.length >= 3
            ) {
              // Verifica se todos os números da coluna não são iguais para poupar combinação, só combina se os números forem diferentes
              const combinacaoDeNotas = combine(colunaNotacaoDetalhada, 2);
              // Caso na análise não tenha nada que distancie mais do que a distancia máxima de casas, não faz nada
              let maiorQueDistanciaMaxima = false;
              // console.log(combinacaoDeNotas);
            } else if (colunaNotacaoDetalhada.length === 2) {
              if (
                distanciaEntreColunas(colunaNotacaoDetalhada) > distancaMaxima
              ) {
                encontrarNotaProximaVazia(colunaNotacaoDetalhada);
                // console.log(colunaNotacaoDetalhada);
              }
            }
  
            colunaNotacaoDetalhada.forEach((notacaoDetalhada) => {
              const tempId = notacaoDetalhada.tempId;
              delete notacaoDetalhada.tempId;
              newColuna[tempId] = {
                ...coluna[tempId],
                match: notacaoDetalhada.valor,
                length: notacaoDetalhada.valor.length,
                cordaIndex: notacaoDetalhada.cordaIndex,
                print: notacaoDetalhada.valor,
                notacoes: [],
              };
              newColuna[tempId].notacoes.push(notacaoDetalhada);
            });
          }
        });
        console.log(newColuna);
      }
      if (newColuna.length <= 0) newColuna = coluna;
      return newColuna;
    }
  }