import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { ExtractedKeyContext, UIRole } from '../types/index.js';

// Node ESM interop helper for @babel/traverse
type TraverseFn = (parent: t.Node, opts: Record<string, unknown>) => void;
const traverse: TraverseFn = (
  typeof _traverse === 'function'
    ? _traverse
    : ((_traverse as unknown as { default?: TraverseFn }).default ?? _traverse)
) as TraverseFn;

export interface ExtractorOptions {
  translationFunctions?: string[];
  filePath?: string;
}

const DEFAULT_TRANSLATION_FUNCTIONS = ['t', '$t', 'formatMessage'];

/**
 * Infers UI role based on surrounding JSX elements, attributes, or code context.
 */
function inferUIRole(path: NodePath): { role: UIRole; parentElement?: string } {
  // Check if expression is an attribute value (e.g. placeholder={t('...')}, title={t('...')})
  const jsxAttr = path.findParent((p) => p.isJSXAttribute()) as NodePath<t.JSXAttribute> | null;
  if (jsxAttr && jsxAttr.node && t.isJSXIdentifier(jsxAttr.node.name)) {
    const attrName = jsxAttr.node.name.name.toLowerCase();
    if (attrName.includes('placeholder')) {
      return { role: 'placeholder', parentElement: attrName };
    }
    if (attrName.includes('title') || attrName.startsWith('aria-')) {
      return { role: 'aria', parentElement: attrName };
    }
    if (attrName.includes('error') || attrName.includes('helpertext')) {
      return { role: 'error', parentElement: attrName };
    }
  }

  // Check enclosing JSX Element
  const jsxElement = path.findParent((p) => p.isJSXElement()) as NodePath<t.JSXElement> | null;
  if (jsxElement && jsxElement.node) {
    const opening = jsxElement.node.openingElement;
    let tagName = 'unknown';

    if (t.isJSXIdentifier(opening.name)) {
      tagName = opening.name.name;
    } else if (t.isJSXMemberExpression(opening.name)) {
      tagName = opening.name.property.name;
    }

    const lowerTag = tagName.toLowerCase();

    if (lowerTag.includes('button') || lowerTag === 'btn') {
      return { role: 'button', parentElement: tagName };
    }
    if (
      lowerTag.startsWith('h1') ||
      lowerTag.startsWith('h2') ||
      lowerTag.startsWith('h3') ||
      lowerTag.startsWith('h4') ||
      lowerTag.startsWith('h5') ||
      lowerTag.startsWith('h6') ||
      lowerTag.includes('heading') ||
      lowerTag.includes('title')
    ) {
      return { role: 'heading', parentElement: tagName };
    }
    if (lowerTag.includes('tooltip') || lowerTag.includes('popover')) {
      return { role: 'tooltip', parentElement: tagName };
    }
    if (lowerTag.includes('alert') || lowerTag.includes('toast') || lowerTag.includes('banner')) {
      return { role: 'alert', parentElement: tagName };
    }
    if (lowerTag.includes('error') || lowerTag.includes('danger')) {
      return { role: 'error', parentElement: tagName };
    }
    if (lowerTag.includes('label')) {
      return { role: 'label', parentElement: tagName };
    }
    if (
      lowerTag === 'p' ||
      lowerTag === 'span' ||
      lowerTag.includes('text') ||
      lowerTag.includes('paragraph') ||
      lowerTag.includes('desc')
    ) {
      return { role: 'paragraph', parentElement: tagName };
    }

    return { role: 'unknown', parentElement: tagName };
  }

  // Check if inside throw statement or error instantiation
  const throwStatement = path.findParent((p) => p.isThrowStatement());
  if (throwStatement) {
    return { role: 'error' };
  }

  return { role: 'unknown' };
}

/**
 * Finds the nearest enclosing component, class, or function name.
 */
function findEnclosingComponentName(path: NodePath): string | undefined {
  let current: NodePath | null = path;

  while (current) {
    if (current.isFunctionDeclaration() && current.node.id) {
      return current.node.id.name;
    }
    if (current.isVariableDeclarator() && t.isIdentifier(current.node.id)) {
      const parent = current.parentPath;
      if (parent && (parent.isVariableDeclaration() || parent.isExportNamedDeclaration())) {
        return current.node.id.name;
      }
    }
    if (current.isClassDeclaration() && current.node.id) {
      return current.node.id.name;
    }
    current = current.parentPath;
  }

  return undefined;
}

/**
 * Extracts parameter names from dynamic interpolation arguments:
 * e.g., t('key', { count: 5, user: 'John' }) => ['count', 'user']
 */
function extractInterpolationParams(args: t.Node[]): string[] {
  const params: string[] = [];
  if (args.length < 2) return params;

  const secondArg = args[1];
  if (t.isObjectExpression(secondArg)) {
    for (const prop of secondArg.properties) {
      if (t.isObjectProperty(prop)) {
        if (t.isIdentifier(prop.key)) {
          params.push(prop.key.name);
        } else if (t.isStringLiteral(prop.key)) {
          params.push(prop.key.value);
        }
      }
    }
  }

  return params;
}

/**
 * Grabs a compact 3-5 line snippet of code surrounding the AST node.
 */
function extractSurroundingSnippet(lines: string[], lineIndex: number): string {
  const start = Math.max(0, lineIndex - 2);
  const end = Math.min(lines.length - 1, lineIndex + 2);
  return lines.slice(start, end + 1).join('\n');
}

/**
 * Extracts leading comments associated with the expression or statement.
 */
function extractLeadingComment(path: NodePath): string | undefined {
  const comments = path.node.leadingComments ?? path.getStatementParent()?.node.leadingComments;
  if (!comments || comments.length === 0) return undefined;
  return comments.map((c) => c.value.trim()).join(' ');
}

/**
 * Analyzes JavaScript/TypeScript/JSX/TSX source code and extracts translation keys and their contexts.
 */
export function extractKeysFromSource(
  code: string,
  options: ExtractorOptions = {}
): ExtractedKeyContext[] {
  const results: ExtractedKeyContext[] = [];
  const fnNames = new Set(options.translationFunctions ?? DEFAULT_TRANSLATION_FUNCTIONS);
  const filePath = options.filePath ?? 'unknown.tsx';
  const lines = code.split(/\r?\n/);

  let ast: t.File;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'exportDefaultFrom',
      ],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse AST for ${filePath}: ${message}`);
  }

  traverse(ast, {
    // 1. Handle CallExpression: t('key'), $t('key'), formatMessage({ id: 'key' })
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee;
      let isMatch = false;
      let keyVal: string | undefined;
      let params: string[] = [];

      // Case A: Simple identifier calls like t('key') or $t('key')
      if (t.isIdentifier(callee) && fnNames.has(callee.name)) {
        isMatch = true;
        const firstArg = path.node.arguments[0];

        if (t.isStringLiteral(firstArg)) {
          keyVal = firstArg.value;
        } else if (t.isTemplateLiteral(firstArg) && firstArg.quasis.length === 1) {
          keyVal = firstArg.quasis[0].value.raw;
        } else if (t.isObjectExpression(firstArg)) {
          // formatMessage({ id: 'key' })
          for (const prop of firstArg.properties) {
            if (t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'id') {
              if (t.isStringLiteral(prop.value)) {
                keyVal = prop.value.value;
              }
            }
          }
        }

        params = extractInterpolationParams(path.node.arguments);
      }
      // Case B: Member expressions like i18n.t('key') or intl.formatMessage({ id: 'key' })
      else if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
        if (fnNames.has(callee.property.name)) {
          isMatch = true;
          const firstArg = path.node.arguments[0];
          if (t.isStringLiteral(firstArg)) {
            keyVal = firstArg.value;
          } else if (t.isTemplateLiteral(firstArg) && firstArg.quasis.length === 1) {
            keyVal = firstArg.quasis[0].value.raw;
          } else if (t.isObjectExpression(firstArg)) {
            for (const prop of firstArg.properties) {
              if (t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'id') {
                if (t.isStringLiteral(prop.value)) {
                  keyVal = prop.value.value;
                }
              }
            }
          }

          params = extractInterpolationParams(path.node.arguments);
        }
      }

      if (isMatch && keyVal) {
        const line = path.node.loc?.start.line ?? 1;
        const column = path.node.loc?.start.column ?? 1;
        const { role, parentElement } = inferUIRole(path);

        results.push({
          key: keyVal,
          filePath,
          line,
          column,
          componentName: findEnclosingComponentName(path),
          parentElement,
          uiRole: role,
          inferredParameters: params,
          surroundingCode: extractSurroundingSnippet(lines, line - 1),
          comment: extractLeadingComment(path),
        });
      }
    },

    // 2. Handle JSXElement: <Trans i18nKey="key" /> or <FormattedMessage id="key" />
    JSXElement(path: NodePath<t.JSXElement>) {
      const opening = path.node.openingElement;
      let tagName = '';
      if (t.isJSXIdentifier(opening.name)) {
        tagName = opening.name.name;
      }

      if (tagName === 'Trans' || tagName === 'FormattedMessage') {
        let keyVal: string | undefined;

        for (const attr of opening.attributes) {
          if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
            const attrName = attr.name.name;
            if (attrName === 'i18nKey' || attrName === 'id') {
              if (attr.value && t.isStringLiteral(attr.value)) {
                keyVal = attr.value.value;
              } else if (
                attr.value &&
                t.isJSXExpressionContainer(attr.value) &&
                t.isStringLiteral(attr.value.expression)
              ) {
                keyVal = attr.value.expression.value;
              }
            }
          }
        }

        if (keyVal) {
          const line = path.node.loc?.start.line ?? 1;
          const column = path.node.loc?.start.column ?? 1;
          const { role, parentElement } = inferUIRole(path);

          results.push({
            key: keyVal,
            filePath,
            line,
            column,
            componentName: findEnclosingComponentName(path),
            parentElement: parentElement ?? tagName,
            uiRole: role === 'unknown' ? 'paragraph' : role,
            inferredParameters: [],
            surroundingCode: extractSurroundingSnippet(lines, line - 1),
            comment: extractLeadingComment(path),
          });
        }
      }
    },
  });

  return results;
}
