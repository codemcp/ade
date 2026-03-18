export default {
  "*": "prettier --write --ignore-unknown",
  "*.{js,ts,mjs,mts,cjs,cts}": "oxlint --fix"
};
