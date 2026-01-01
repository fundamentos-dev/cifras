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

## Busca, apresentação e atalhos

- **Busca**: use o botão flutuante ou os atalhos `/`, `Ctrl+K` ou `Cmd/Ctrl+Shift+F` para abrir.
- **Navegação na busca**: use `↑`/`↓` para trocar de resultado, `Enter` para abrir e `Esc` para fechar.
- **Modo de apresentação**: `Cmd/Ctrl+M` alterna entre **Cifra** e **Letra**.
- **Slides**: em **Letra**, use `←`/`→` para avançar/voltar.
- **Exibição**: ajustes de tamanho de fonte e line-height funcionam tanto em **Cifra** quanto em **Letra**; colunas são exclusivas do modo **Letra**.
- **Compacto**: ao ativar, as seções são mescladas e o texto é encaixado em duas colunas sem rolagem; os controles de line-height, fonte e colunas ficam ocultos e os ajustes são resetados para o encaixe automático.
- **Cabeçalhos compactos**: títulos de seção aparecem em destaque, sem colchetes.

## Tema

- O toggle **Tema** alterna entre claro e escuro.
- O estado inicial segue o tema do sistema operacional.
- A escolha fica salva no navegador após a primeira alteração.

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
