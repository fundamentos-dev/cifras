# CLAUDE.md

Guia para agentes e contribuidores deste repositório. Para estilo de código e
convenções de nomenclatura, veja também [AGENTS.md](AGENTS.md).

## O que é

Repositório pessoal, **self-hosted** (GitHub Pages + Jekyll), de letras e cifras.
Tem **duas funções principais**:

1. **Modo Cifra** — exibe a cifra com os acordes alinhados acima da letra, com
   transposição de tom em tempo real.
2. **Modo Letra** — exibe a letra em visualização de **apresentação de slides**
   (tela cheia), para acompanhamento durante o louvor.

Não há build nem framework: HTML + CSS + JavaScript vanilla (ES6+). Servir é
abrir `index.html` (ou `pnpm dev`, que sobe o live-server na porta 3000).

## Regras invioláveis (princípios de design)

Estas regras vêm dos requisitos do projeto e **não devem ser quebradas** ao
mexer no código:

1. **Um único `.txt` por música é a fonte da verdade.** Título, tom, ordem dos
   trechos, ajuste de fonte e a própria letra/cifra vivem todos no mesmo arquivo
   em `examples/`. Nada de banco de dados, JSON paralelo ou metadados duplicados.
   (O `examples/index.json` é só a listagem gerada pelo Jekyll — não é fonte de
   conteúdo.)
2. **Nunca quebrar uma estrofe.** No modo Letra (slides), uma estrofe é a
   unidade indivisível: jamais pode ser cortada ao meio entre colunas ou entre
   slides. Quebra só é permitida **entre** estrofes.
3. **Preservar o alinhamento das cifras.** No modo Cifra, o acorde fica
   exatamente acima da sílaba correspondente. Qualquer estilo/transformação não
   pode deslocar horizontalmente os caracteres (usar fonte monoespaçada; o
   destaque do acorde não pode alterar a largura do texto).
4. **Responsivo.** Funciona em telas pequenas (a cifra reflui via `Cifra.render`
   no modo mobile) e a letra encaixa automaticamente na tela do slide.

## Formato do arquivo `.txt`

```
Título da Música            ← 1ª linha não vazia = título (obrigatório)
Tom: C                      ← cabeçalho de metadados (opcional)
Ordem: Intro > Estrofe 1 > Refrão > Estrofe 2 > Refrão > Ponte > Refrão
Fonte: auto

[Intro]
C  G  Am  F                 ← linhas só de acordes (somem no modo Letra)

[Estrofe 1]
 C              G
Linha de letra com cifra
                            ← linha em branco = separa estrofes
Outra estrofe da seção

[Refrão]
Conteúdo do refrão...
```

### Cabeçalho de metadados

Ficam logo **após o título**, antes da primeira linha em branco ou da primeira
seção `[...]`. A ordem entre eles não importa. Linhas não reconhecidas encerram
o cabeçalho.

| Chave    | Valores                                  | Efeito |
|----------|------------------------------------------|--------|
| `Tom:`   | `C`, `D#`, `Bb`, `Am`, ...               | Tom original da cifra (base da transposição). |
| `Ordem:` | nomes de seção separados por `>` ou `,`  | Sequência de exibição dos trechos. Reaproveita seções repetidas (ex.: Refrão) sem reescrever. Sem `Ordem:`, segue a ordem do documento. |
| `Fonte:` | `auto` (padrão), `90%` ou `0.9`          | `auto` = encaixe automático nos slides. Valor fixo define a escala-base da fonte da letra (ponto de partida do encaixe). |
| `Link:`  | URL (Spotify, YouTube, ...)              | Referência externa da música. Reconhecida e removida do corpo; a interface ainda **não** a exibe. |

### Seções e estrofes

- `[Nome da Seção]` abre uma seção (ex.: `[Estrofe 1]`, `[Refrão]`, `[Ponte]`).
- **Linha em branco separa estrofes** dentro de uma seção.
- **Linhas que contêm apenas acordes** são detectadas por `Cifra.isLinhaCifra`
  e exibidas no modo Cifra, mas **removidas** no modo Letra.
- Compatibilidade: uma seção com título mas **sem conteúdo** (ex.: `[Refrão]`
  repetido vazio) reutiliza o conteúdo da primeira ocorrência com o mesmo nome.
  `Ordem:` é a forma preferida e mais explícita de fazer isso.

## Arquitetura

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Marcação; carrega os scripts em ordem de dependência. |
| `css/main.css` | Tema (claro/escuro), painel de controles, modo cifra e slides. |
| `js/config.js` | `appState` (estado global), dicionários de notas/tons, `renderCifraView` (breakpoints responsivos da cifra). |
| `js/utils.js` | Utilidades genéricas. |
| `js/classes/Nota.js` | Representação de nota. |
| `js/classes/Cifra.js` | Detecção de linha de cifra, extração, **transposição** (`alterarTom`) e renderização desktop/mobile mantendo alinhamento. |
| `js/main.js` | Toda a lógica de UI: busca, tema, modos, e o **pipeline de slides**. |

### Pipeline de slides (em `js/main.js`)

Fluxo de dados, em ordem:

1. `parseSongMetadata(rawText)` — extrai `Tom`/`Ordem`/`Fonte` e remove essas
   linhas; o resto vira o texto da música.
2. `construirSlides()` — separa o título (1ª linha) do corpo e chama o parser.
3. `parseSecoes(texto)` — corpo → seções → **estrofes** (blocos).
4. `resolverRepeticoes(secoes)` — preenche seções vazias repetidas.
5. `montarSequencia(secoes, ordem)` — aplica `Ordem:`.
6. `buildSlides(secoes)` — gera slides como lista de **elementos**
   (`{tipo:"header"}` ou `{tipo:"estrofe", linhas}`). No modo compacto, mescla
   seções até `COMPACT_LINE_BUDGET`, **sempre preservando estrofes inteiras**.
   No modo normal, o título da música ocupa um **slide próprio** no início
   (`{isTitle:true}`).
7. `renderSlide()` — renderiza cada estrofe num `<div class="slide-stanza">`
   (com `break-inside: avoid` no CSS).
8. `updateSlideStyles()` — decide o número de colunas (2 colunas só acima de
   `MIN_TWO_COLUMN_WIDTH`; telas estreitas sempre 1) e agenda o encaixe.
9. `applyShrinkToFit()` — roda **em ambos os modos** (compacto e normal): reduz
   line-height e depois a fonte para encaixar sem rolagem; se ainda não couber,
   `paginateSlide()` divide o slide **numa fronteira entre elementos** (nunca no
   meio de uma estrofe). A letra **sempre cabe na tela** — `#slide_content` tem
   `overflow: hidden` no modo letra (rolagem só no fallback raro de uma estrofe
   única maior que a tela, via `data-slide-overflow`).

O `resize` da janela (debounced) reconstrói os slides para a nova largura e
reencaixa — incluindo recalcular o número de colunas.

> O modelo de slide é **baseado em elementos** (`slide.elementos`), não em
> linhas soltas. Ao mexer aqui, mantenha estrofes como blocos atômicos — é o que
> garante a Regra 2.

### Controles condicionais

Um controle só aparece quando seu uso tem efeito naquele modo:

- **Tom** e **Fonte (A-/A+) / Altura (H-/H+)**: só no **modo Cifra** (no modo
  Letra o encaixe é automático).
- **Colunas**: só no **modo Letra não compacto** e com largura suficiente
  (`can-two-columns`, gatilho `MIN_TWO_COLUMN_WIDTH`).

## Atalhos

- Busca: `/`, `Ctrl+K` ou `Cmd/Ctrl+Shift+F`. Navegar: `↑`/`↓`, `Enter`, `Esc`.
- Alternar Cifra/Letra: `Cmd/Ctrl+M`.
- Navegar slides (modo Letra): `←`/`→`.

## Como verificar mudanças

1. `pnpm dev` (live-server na porta 3000).
2. Modo Cifra: confira o alinhamento acorde↔letra e a transposição (`±½ tom`).
3. Modo Letra: confira que nenhuma estrofe é cortada entre colunas/slides, em
   janelas largas e estreitas, com e sem o modo Compacto.
