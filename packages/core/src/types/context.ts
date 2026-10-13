/**
 * Represents the inferred role of a UI element where a translation key is invoked.
 */
export type UIRole =
  | 'button'
  | 'heading'
  | 'label'
  | 'paragraph'
  | 'error'
  | 'alert'
  | 'tooltip'
  | 'placeholder'
  | 'aria'
  | 'unknown';

/**
 * Rich context extracted from source code AST to guide LLM translation.
 */
export interface ExtractedKeyContext {
  /** The translation key identifier (e.g. 'checkout.proceed_button') */
  key: string;
  /** Relative or absolute path to the source file */
  filePath: string;
  /** 1-based line number in source code */
  line: number;
  /** 1-based column number in source code */
  column: number;
  /** Surrounding React/Vue/Svelte component or function name */
  componentName?: string;
  /** Direct JSX parent element tag name (e.g., 'button', 'AlertTitle') */
  parentElement?: string;
  /** Inferred UI purpose based on AST analysis */
  uiRole: UIRole;
  /** Dynamic interpolation parameters detected in usage (e.g. ['count', 'itemType']) */
  inferredParameters: string[];
  /** Surrounding lines of code for LLM semantic grounding */
  surroundingCode?: string;
  /** Developer inline comment or JSDoc directly associated with this translation */
  comment?: string;
}
