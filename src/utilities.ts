// logging fro debugging when composing functions.
// https://mostly-adequate.gitbook.io/mostly-adequate-guide/ch05#debugging
const trace = (tag: unknown) => (x: unknown) => {
  console.log(tag, x);
  return x;
};
