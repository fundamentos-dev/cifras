# Repositório Pessoal de Letras e Cifras - SelfHosted

## Modulação de cifras

### Conceito

Este projeto trabalha com cifras para viola caipira. A ideia é permitir que o mesmo conjunto de acordes seja lido em diferentes
tons mantendo a formatação do texto original da música.

A aplicação recebe uma cifra como entrada e:

- [x] Permite alternar entre o modo de cifras tradicionais e um modo de apresentação da letra
- [x] Permite que, ao trocar o tom da música, as cifras sejam atualizadas
- [x] Mantém a letra alinhada às cifras após a mudança de tom
- [x] Ajusta automaticamente a exibição para telas menores

### Executando o projeto

Para executar o servidor de desenvolvimento, use:

```bash
pnpm dev
```

Isso iniciará o live-server na porta 3000 e abrirá o index.html no navegador.

# Instruções de uso

Importe os arquivos de script em sua página HTML na ordem abaixo:

```html
<script src="js/utils.js"></script>
<script src="js/classes/Nota.js"></script>
<script src="js/config.js"></script>
<script src="js/classes/Cifra.js"></script>
<script src="js/main.js"></script>
```

Caso prefira minimizar as requisições, copie todos os arquivos importados para um único arquivo `script.js` e utilize uma ferram
enta como https://javascript-minifier.com para minificá-lo.

## Configurações

As configurações ficam em `config.js`. O estado da aplicação (tonalidade atual, lista de cifras disponíveis e preferências de
display) é definido nesse arquivo.

| Variável | Descrição |
|---|---|
| `appState` | Guarda informações de estado da cifra, o modo atual, slides da letra e suas configurações iniciais |

## Funções importantes

### `renderCifraView`

Função utilizada em `config.js` para definir os *breakpoints* e ajustar a quebra de linhas da cifra para diferentes tamanhos de
tela.

### `Cifra.alterarTom(notacaoTom)`

Método da instância de `Cifra`. Altera a cifra instanciada de `appState.tomOriginal` para o tom indicado em `notacaoTom`.
