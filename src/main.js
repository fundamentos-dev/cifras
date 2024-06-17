import './styles.scss';

// Componente para listar os arquivos de cifras disponíveis
class CifraList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <ul id="cifraList"></ul>
    `;
  }

  connectedCallback() {
    this.loadCifraList();
  }

  async loadCifraList() {
    try {
      const response = await fetch('cifras-list.json'); // Carrega a lista de arquivos do JSON
      const fileList = await response.json();
      const listElement = this.shadowRoot.getElementById('cifraList');

      fileList.forEach(file => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.textContent = file;
        link.href = "#";
        link.addEventListener('click', (event) => {
          event.preventDefault();
          this.loadCifra(file);
        });
        listItem.appendChild(link);
        listElement.appendChild(listItem);
      });
    } catch (error) {
      console.error('Erro ao carregar a lista de cifras:', error);
    }
  }

  loadCifra(fileName) {
    document.querySelector('cifra-display').setAttribute('data-file', fileName);
  }
}

customElements.define('cifra-list', CifraList);

// Componente para exibir o conteúdo da cifra
class CifraDisplay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <pre id="cifraContent"></pre>
    `;
  }

  static get observedAttributes() {
    return ['data-file'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'data-file') {
      this.loadCifraContent(newValue);
    }
  }

  async loadCifraContent(fileName) {
    try {
      const response = await fetch(`path/to/cifras/${fileName}`); // Caminho para o arquivo de cifras
      const text = await response.text();
      this.shadowRoot.getElementById('cifraContent').textContent = text;
    } catch (error) {
      console.error('Erro ao carregar a cifra:', error);
    }
  }
}

customElements.define('cifra-display', CifraDisplay);
