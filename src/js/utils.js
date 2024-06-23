/**
 * Carlos R. L. Rodrigues
 * http://jsfromhell.com/array/combine [rev. #1]
 *
 * @param {Array} a Array para recombinar
 * @param {int} q numero de itens no agrupamento
 */
function combine(a, q) {
  var n = a.length - 1,
    l = n - q + 1,
    x = 0,
    c = [],
    z = -1,
    p,
    j,
    d,
    i;
  if (q > n || q < 2) return c;
  for (p = [], i = q; (p[--i] = i); );
  while (x <= l) {
    for (c[++z] = [], j = -1; ++j < q; c[z][j] = a[p[j]]);
    if (++p[j - 1] > n)
      while (j--)
        if ((!j && x++, (d = p[j]) < l + j)) {
          while (j < q) p[j++] = ++d;
          break;
        }
  }
  return c;
}

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()\/\|\[\]\\]/g, "\\$&");
};

const getLinhaByCharIndex = (charIndex) => {
  const linha = appState.linhas.filter(
    (linha) => charIndex <= linha.end && charIndex >= linha.start
  );
  return linha[0].order;
};

// Captura qualquer nota com bemois e transforma em sustenidos
const diegoHackChangeBemois = (string) => {
  const map = {
    Cb: "B",
    Db: "C#",
    Eb: "D#",
    Fb: "E",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
  };

  let result = string;
  if (string) {
    Object.entries(map).forEach((note) => {
      if (string.includes(note[0])) {
        result = string.replace(note[0], note[1]);
      }
    });
  }

  console.log(string, result);
  return result;
};
