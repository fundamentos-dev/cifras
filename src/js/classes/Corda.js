class Corda {
    constructor(notacao, limiteDeCasas) {
      this.nota = new Nota(notacao, dicionarioNotas[notacao]);
      this.limiteDeCasas = limiteDeCasas || 19;
    }
  }