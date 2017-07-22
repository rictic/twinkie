import { AST_NODE, AST_TREE, EXPRESSION } from "./types";

export function printTree(tree: AST_TREE) {
  let ret = "";

  ret += "export interface View {\n";

  for (const expression of Object.values<AST_NODE>(tree)) {
    expression.expression;
    ret += `  ${expression.expression}: ${printExpressionType(expression)};\n`;
  }

  ret += "};";

  return ret;
}

function argumentCountToArgs(count: number) {
  return new Array(count)
    .fill("")
    .map((_, i) => {
      return `arg${i}: any`;
    })
    .join(", ");
}

function printExpressionType(node: AST_NODE) {
  if (node.type === EXPRESSION.VALUE) {
    return "any";
  }

  if (node.type === EXPRESSION.FUNCTION) {
    return `(${argumentCountToArgs(node.argumentCount || 0)}) => any`;
  }

  if (node.type === EXPRESSION.LIST) {
    return "any[]";
  }

  return "any";
}
