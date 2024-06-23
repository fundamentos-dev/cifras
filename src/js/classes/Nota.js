class Nota {
    constructor(notacao, numero) {
      this.notacao = notacao;
      this.numero = numero || dicionarioNotas[notacao];
    }
  
    /** Captura uma nota pelo seu número */
    static capturarNota = (numero) => {
      // 64
      let notaNumero;
      // Se > 12 divido o valor por 12 que é o número de notas em uma oitava
      if (numero > 12) {
        notaNumero = numero % 12;
      } else {
        notaNumero = numero;
      }
  
      // Aqui não leva em consideração o tom para dar o nome da nota, já que é irrelevante para a tablatura que só leva o número das casas
      const notacao = Object.entries(dicionarioNotas).filter(
        (nota) => nota[1] === numero
      )[0];
      return new Nota(notacao, notaNumero);
    };
  }