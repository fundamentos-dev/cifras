## Modulação de tablatura

### Conceito

Uma viola é um instrumento musical composto por 5 pares de cordas ou um pouco mais. As afinações mais utilizadas são as cebolão em Mi e Ré.  

Tablatura é uma forma gráfica de escrever as notas a serem tocas em ordem sem a variável ritmo. 

Esse script tem por finalidade receber uma tablatura como entrada e:

- [ ] Permitir que, ao trocar a afinação entre Cebolão Mi e Cebolão Ré, a tablatura se ajuste
- [ ] Permitir que, ao trocar o tom da música, a tablatura se ajuste
- [ ] Permitir a quebra de linhas para tablaturas longas serem responsivas em dispositivos móveis

### Executando o projeto

Para executar o servidor de desenvolvimento, use:

```bash
pnpm dev
```

Isso iniciará o live-server na porta 3000 e abrirá o index.html no navegador.

### Notações de tablatura

h - hammer-on
p - pull-off
b - bend
r - soltar o bend
~ ou v - vibrato
t - tap
ou / ou s - slide
x - tocar a nota abafada

Notação | Tradução | Explicação
--- | --- | ---
`h` | hammer-on | Tocar a nota sem auxílio da mão direita, como um martelo na nota
`p` | pull-off |
`b` | bend | modular uma nota arrastando ela pressionada para cima
`r` | release | soltar o bend
`~ ou v` | vibrato | fazer um vibrato com a corda com movimentos longitudinais rapidos com a nota pressionada
`/ ou s` | slide | arrastar o dedo de uma casa para outra
`x` | | tocar a nota abafada

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
