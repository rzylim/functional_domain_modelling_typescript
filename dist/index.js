"use strict";
/** @since 1.0.0 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.greet = void 0;
var function_1 = require("fp-ts/function");
// -----------------------------------------------------------------------------
// greetings
// -----------------------------------------------------------------------------
/**
 * It's a greeting
 *
 * @since 1.0.0
 * @category Greetings
 * @example
 *   import { greet } from "functional-domain-modelling";
 *   assert.deepStrictEqual(greet("World"), "Hello, World!");
 */
var greet = function (name) {
  return (0, function_1.pipe)("Hello", function (x) {
    return "".concat(x, ", ").concat(name, "!");
  });
};
exports.greet = greet;
