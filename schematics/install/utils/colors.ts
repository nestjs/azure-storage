// Copied from Angular CLI deprecated Terminal
// TODO: Migrate to chalk or some color library
export function mapObject<T, V>(
  obj: { [k: string]: T },
  mapper: (k: string, v: T) => V,
): { [k: string]: V } {
  return Object.keys(obj).reduce((acc: { [k: string]: V }, k: string) => {
    acc[k] = mapper(k, obj[k]);

    return acc;
  }, {});
}

const kColors = {
  modifiers: {
    reset: [0, 0],
    bold: [1, 22], // 21 isn't widely supported and 22 does the same thing
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29],
  },
  colors: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    gray: [90, 39],
  },
  bgColors: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
  },
};

const kColorFunctions = mapObject(kColors, (_, v) => {
  return mapObject(
    v,
    (_, vv) => (x: string) => `\u001b[${vv[0]}m${x}\u001b[${vv[1]}m`,
  );
});

export const red = kColorFunctions.colors.red;
export const green = kColorFunctions.colors.green;
