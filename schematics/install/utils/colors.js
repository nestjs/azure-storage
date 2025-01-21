"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.green = exports.red = exports.mapObject = void 0;
function mapObject(obj, mapper) {
    return Object.keys(obj).reduce((acc, k) => {
        acc[k] = mapper(k, obj[k]);
        return acc;
    }, {});
}
exports.mapObject = mapObject;
const kColors = {
    modifiers: {
        reset: [0, 0],
        bold: [1, 22],
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
    return mapObject(v, (_, vv) => (x) => `\u001b[${vv[0]}m${x}\u001b[${vv[1]}m`);
});
exports.red = kColorFunctions.colors.red;
exports.green = kColorFunctions.colors.green;
