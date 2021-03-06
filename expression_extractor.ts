const ONE_WAY_BINDING_REGEX = /\[\[(.*?)\]\]/;
const TWO_WAY_BINDING_REGEX = /\{\{(.*?)\}\}/;
const IS_NUMBER_PRIMITIVE_REGEX = /^-?\d+$/;
const HAS_POSTFIX_OBSERVER_REGEX = /^.*\.\*$/;
const IS_STRING_PRIMITIVE_REGEX = /^".*"$|^'.*'$/;
const IS_BOOL_PRMITIVE_REGEX = /^true$|^false$/;
const NATIVE_BINDING_REGEX = /^(.*)::.*$/;
const ARRAY_INDEX_ACCESS = /.*\[\]\.length$/;

import { AliasMap } from "./types";
import { isExpressionFunction, replaceFunctionArguments } from "./utils";

function unAliasExpressions(expressions: string[], aliasMap: AliasMap) {
  return expressions.map(expression => {
    const leftExpression = expression.split(".")[0];

    if (aliasMap[leftExpression] !== undefined) {
      expression = expression.replace(leftExpression, aliasMap[leftExpression]);
    }

    return expression;
  });
}

export function removeObserverPostfixes(expressions: string[]) {
  return expressions.map(v => {
    if (v.match(HAS_POSTFIX_OBSERVER_REGEX)) {
      return v.slice(0, -2);
    }

    return v;
  });
}

export function removePrimitiveExpressions(expressions: string[]) {
  return expressions.filter(expression => {
    return (
      !expression.match(IS_NUMBER_PRIMITIVE_REGEX) &&
      !expression.match(IS_STRING_PRIMITIVE_REGEX) &&
      !expression.match(IS_BOOL_PRMITIVE_REGEX)
    );
  });
}

export function stripNegationPrefixes(expressions: string[]) {
  return expressions.map(v => {
    if (v.startsWith("!")) {
      return v.slice(1);
    }

    return v;
  });
}

function stripNativeBindingPostfixes(expressions: string[]) {
  return expressions.map(expression => {
    const match = expression.match(NATIVE_BINDING_REGEX);

    if (match != null) {
      return match[1];
    }

    return expression;
  });
}

export function extractExpression(str: string, aliasMap: AliasMap) {
  let ret: string[] = [];
  let startingIndex = 0;

  if (str.length === 0) {
    return ret;
  }

  while (true) {
    const substring = str.slice(startingIndex);
    const twoWayMatch = substring.match(TWO_WAY_BINDING_REGEX);
    const oneWayMatch = substring.match(ONE_WAY_BINDING_REGEX);

    if (
      oneWayMatch != null &&
      oneWayMatch.index !== undefined &&
      twoWayMatch != null &&
      twoWayMatch.index !== undefined
    ) {
      if (oneWayMatch.index < twoWayMatch.index) {
        ret.push(oneWayMatch[1]);
        startingIndex += oneWayMatch.index + oneWayMatch[0].length;
      } else {
        ret.push(twoWayMatch[1]);
        startingIndex += twoWayMatch.index + twoWayMatch[0].length;
      }

      continue;
    }

    if (oneWayMatch != null && oneWayMatch.index !== undefined) {
      ret.push(oneWayMatch[1]);
      startingIndex += oneWayMatch.index + oneWayMatch[0].length;
      continue;
    }

    if (twoWayMatch != null && twoWayMatch.index !== undefined) {
      ret.push(twoWayMatch[1]);
      startingIndex += twoWayMatch.index + twoWayMatch[0].length;
      continue;
    }

    // no more matches time to bail.
    break;
  }

  ret = removeObserverPostfixes(
    stripNegationPrefixes(stripNativeBindingPostfixes(ret))
  );

  if (Object.keys(aliasMap).length > 0) {
    ret = unAliasExpressions(ret, aliasMap);
  }

  ret = ret.map(expression => {
    if (isExpressionFunction(expression)) {
      return replaceFunctionArguments(expression, v => {
        let ret = unAliasExpressions(
          removeObserverPostfixes(
            stripNegationPrefixes(stripNativeBindingPostfixes([v]))
          ),
          aliasMap
        );

        // If we have an alias in place, that means we are in a dom-repeat
        // we need to replace the arg with a primitive.
        if (Object.keys(aliasMap).length) {
          ret = ret.map(v => (v === "index" ? '"fake_index"' : v));
        }

        return ret.join("");
      });
    }

    return expression;
  });

  // If we have an alias in place, that means we are in a dom-repeat
  // we need to filter out the index expression.
  if (Object.keys(aliasMap).length) {
    ret = ret.filter(v => v !== "index");
  }

  // Filter out calls like a[].length and a[][].length
  ret = ret.filter(v => v.match(ARRAY_INDEX_ACCESS) == null);
  return ret;
}
