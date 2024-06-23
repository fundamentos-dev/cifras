class Notacao {
  /**
   *
   * @param {string} match // O match do regex à procura de notações, partindo de uma string escrita em texto corrido
   * @param {int} index // Em que indexOf da linha o registro deu match, útil na substituição
   * @param {int} length // tamanho da string match
   * @param {array} notacoes // string match com mais detalhes, dividido em pequenos objetos que define se é uma nota ou um efeito
   * @param {int} ordem // coluna em que o match aparece, uma coluna é o momento em que notas devem ser tocadas simultâneamente
   * @param {int} tablaturaIndex // qual o index da tablatura de appState.tablaturas, essa notação pertence
   * @param {int} cordaIndex // o index da corda da tablatura que essa notação pertence
   * @param {string} print // O texto corrigido que deve aparecer por extenso na tablatura
   * @param {boolean} estatico // Se a notação é estática, ou seja, não deve variar tom
   */
  constructor({
    match,
    index,
    length,
    notacoes,
    ordem,
    tablaturaIndex,
    cordaIndex,
    print,
    estatico,
  }) {
    this.index = index;
    this.match = match;
    this.length = length || this.match.length;
    this.notacoes = notacoes || Notacao.getNotacoes(this.match);
    this.ordem = ordem;
    this.tablaturaIndex = tablaturaIndex;
    this.cordaIndex = cordaIndex;
    this.estatico = estatico || false;
    this.print = print || this.match;
  }

  /** Extrai os matches das notações, detalhando mais eles na diferenciação de notas e efeitos */
  static getNotacoes(notacao) {
    let notas = notacao.match.split(/\D/).filter((nota) => nota !== ""),
      efeitos = notacao.match.split(/\d+/).filter((efeito) => efeito !== ""),
      estatico = notacao.match.match(/\[.+\]/);

    // Primeiramente verifica posicionamento dos dígitos
    notas.forEach((nota, i, a) => {
      let indexOfString = notacao.match.indexOf(nota);
      a[i] = {
        valor: nota,
        tipo: "nota",
        index: indexOfString,
        cordaIndex: notacao.cordaIndex,
      };
    });

    // Verifica posicionamento dos efeitos
    efeitos.forEach((efeito, i, a) => {
      let indexOfString = notacao.match.indexOf(efeito);
      a[i] = {
        valor: efeito,
        tipo: "efeito",
        index: indexOfString,
        cordaIndex: notacao.cordaIndex,
      };
    });

    // Verifica elemento estático
    if (estatico) {
      let indexOfString = notacao.match.indexOf(estatico);
      estatico = {
        valor: estatico,
        tipo: "estatico",
        index: indexOfString,
        cordaIndex: notacao.cordaIndex,
      };
    }

    // Une as notações diferenciando efeitos e notas
    let notacoes = estatico
      ? [...notas, ...efeitos, estatico]
      : [...notas, ...efeitos];
    notacoes = notacoes.sort((a, b) =>
      a.index > b.index ? 1 : b.index > a.index ? -1 : 0
    );

    return notacoes;
  }
}
