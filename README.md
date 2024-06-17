## Crifras

Uma aplicação self-hosted de baixo impacto em memória para amazenar cifras e letras de músicas, criar grupos para `eventos` específicos, ordenando a exibição das mesmas com algumas funcionalidades como:

- Busca por nome da música
- Troca de tom em tempo real
- Criação de eventos
- Configuração de usuário e senha master

### Roadmap

- [ ] Transformar os textos de forma exibível para slides, facilitando a projeção da música em eventos (talvez com background à escolha) 

### Notações utilizadas para criar cifras

Uma cifra é composta por linhas em branco, linhas com cifras e linhas com letras. Essas duas últimas geralmente são intercaladas entre si. Existem alguns recursos que podemos utilizar para que efeitos sejam disponibilizados na interface da aplicação, são eles:

[Seção] - Colocar um termo entre colchetes faz com que o trecho abaixo seja considerado uma seção, seu uso poderá se reptir outras vezes
.Observação. - Colocar um termo entre pontos em uma linha de cifras fazcom que o termo seja ignorado e não contabilizado para busca de cifras

# Instruções de uso

Primeiramente é necessário importar todos os arquivos de script em sua página: 

```html
<script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
<script src="js/utils.js"></script>
<script src="js/classes/Nota.js"></script>
<script src="js/classes/Corda.js"></script>
<script src="js/classes/Afinacao.js"></script>
<script src="js/config.js"></script>
<script src="js/classes/Notacao.js"></script>
<script src="js/classes/Tablatura.js"></script>
<script src="js/classes/Cifra.js"></script>
<script src="js/main.js"></script>
```

Pode se considerar interessante importar apenas um arquivo, nesse caso considere copiar todos os arquivos importados na ordem em um só arquivo `script.js` e utilize uma ferramenta como https://javascript-minifier.com para minificar o arquivo deixando mais leve de carregar e diminuindo o número de requisições

```html
<script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
<script src="js/script.min.js"></script>
```

## Configurações
Para configurações existe um arquivo chamado `config.js`. O estado do app (no caso o estado da cifra/tablaturas e as suas configurações iniciais podem ser feitas por esse arquivo).  

| Variável | Descrição |
|---|---|
| `appState` | guarda informações de estado da cifra e armazena as tablaturas |
| `afinacoes` | Guarda as afinações possíveis, que alimenta o campo select e calcula as tonalidades com base nas cordas de cada afinação |

## Funções importantes

### `renderDependingOnWindowSize`

Função utilizada em `config.js` para estabelecer os *breakpoints* utilizados na quebra de tablaturas (o número indicado significa o número de notações por lina) e letra (número de caracteres com correção de palavras, ou seja, se uma palavra encerra no meio da quebra, ela é escrita até o final)

### `Tablatura.extrairDaCifra(Afinacao, string): [Tablatura]`

Utilizado para extrair de uma cifra em string as tablaturas e salvála no `appState.tablaturas` como uma lista de objetos Tablatura

### `tablatura.alterarTom(notacaoTom)`

Método da instância de `Tablatura`. Altera o da tablatura instanciada de `appState.tomOriginal` para o tom em `notacaoTom`

### `cifra.alterarTom(notacaoTom)`

Método da instância de `Cifra`. Altera o da tablatura instanciada de `appState.tomOriginal` para o tom em `notacaoTom`
