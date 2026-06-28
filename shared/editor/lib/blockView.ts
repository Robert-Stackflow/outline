import { EditorStyleHelper } from "../styles/EditorStyleHelper";

export interface BlockViewElements {
  /** Root DOM element that represents the visual block envelope. */
  dom: HTMLElement;
  /** Optional non-editable chrome area for indicators or controls. */
  chrome?: HTMLElement;
  /** Editable content mount used by ProseMirror. */
  contentDOM: HTMLElement;
  /** Real DOM layer used for block backgrounds and selection state. */
  halo: HTMLElement;
  /** Optional visible indicator owned by the block. */
  indicator?: HTMLElement;
}

export interface AttachBlockViewOptions {
  /** Node name used for data attributes and debugging. */
  nodeName: string;
  /** Semantic block role, for styling hooks. */
  role: string;
  /** Extra classes for the root block view. */
  classNames?: string[];
  /** Extra attributes for the root block view. */
  attrs?: Record<string, string>;
}

export interface BlockViewOptions {
  /** Node name used for data attributes and debugging. */
  nodeName: string;
  /** Semantic block role, for styling hooks. */
  role: string;
  /** Root DOM tag. */
  domTagName?: string;
  /** Editable content DOM tag. */
  contentTagName?: string;
  /** Extra classes for the root block view. */
  classNames?: string[];
  /** Extra classes for the editable content DOM. */
  contentClassNames?: string[];
  /** Extra attributes for the root block view. */
  attrs?: Record<string, string>;
  /** Extra attributes for the editable content DOM. */
  contentAttrs?: Record<string, string>;
  /** Whether the block owns a non-editable chrome column. */
  chrome?: boolean;
  /** Text shown in the block indicator. */
  indicatorText?: string;
  /** Extra classes for the indicator element. */
  indicatorClassNames?: string[];
}

/**
 * Creates the canonical DOM skeleton for a first-class editor block.
 *
 * @param options - the block view options.
 * @returns the created block view elements.
 */
export function createBlockViewElements(
  options: BlockViewOptions
): BlockViewElements {
  const dom = document.createElement(options.domTagName ?? "div");
  attachBlockViewRoot(dom, options);

  const contentDOM = document.createElement(options.contentTagName ?? "div");
  contentDOM.classList.add(EditorStyleHelper.blockContent);
  for (const className of options.contentClassNames ?? []) {
    contentDOM.classList.add(className);
  }
  setAttributes(contentDOM, options.contentAttrs);

  const halo = createBlockSelectableHalo();

  if (!options.chrome) {
    dom.appendChild(contentDOM);
    dom.appendChild(halo);
    return { dom, contentDOM, halo };
  }

  const chrome = document.createElement("span");
  chrome.className = EditorStyleHelper.blockChrome;
  chrome.contentEditable = "false";

  const indicator = document.createElement("span");
  indicator.classList.add(EditorStyleHelper.blockIndicator);
  for (const className of options.indicatorClassNames ?? []) {
    indicator.classList.add(className);
  }
  indicator.textContent = options.indicatorText ?? "";

  chrome.appendChild(indicator);
  dom.appendChild(chrome);
  dom.appendChild(contentDOM);
  dom.appendChild(halo);

  return { dom, chrome, contentDOM, halo, indicator };
}

/**
 * Attaches the canonical block-view classes, data attributes, and halo to an
 * existing DOM element.
 *
 * @param dom - the existing block root.
 * @param options - the block view attach options.
 * @returns the block selectable halo element.
 */
export function attachBlockViewHalo(
  dom: HTMLElement,
  options: AttachBlockViewOptions
): HTMLElement {
  attachBlockViewRoot(dom, options);

  const existingHalo = Array.from(dom.children).find(
    (child) =>
      child instanceof HTMLElement &&
      child.classList.contains(EditorStyleHelper.blockHalo)
  );
  if (existingHalo instanceof HTMLElement) {
    return existingHalo;
  }

  const halo = createBlockSelectableHalo();
  dom.appendChild(halo);
  return halo;
}

/**
 * Creates the real DOM layer used for block backgrounds and selection.
 *
 * @returns the block selectable halo element.
 */
export function createBlockSelectableHalo(): HTMLElement {
  const halo = document.createElement("span");
  halo.className = EditorStyleHelper.blockHalo;
  halo.contentEditable = "false";
  halo.setAttribute("aria-hidden", "true");
  return halo;
}

/**
 * Returns whether a mutation should be ignored by a block NodeView.
 *
 * @param contentDOM - the editable content element.
 * @param mutation - the observed DOM mutation.
 * @returns true when the mutation belongs to block chrome.
 */
export function shouldIgnoreBlockViewMutation(
  contentDOM: HTMLElement,
  mutation: MutationRecord
) {
  if (mutation.type === "selection") {
    return false;
  }

  return !contentDOM.contains(mutation.target);
}

function setAttributes(
  element: HTMLElement,
  attrs: Record<string, string> | undefined
) {
  if (!attrs) {
    return;
  }

  for (const [name, value] of Object.entries(attrs)) {
    element.setAttribute(name, value);
  }
}

function attachBlockViewRoot(
  dom: HTMLElement,
  options: AttachBlockViewOptions
) {
  dom.classList.add(
    EditorStyleHelper.blockView,
    `${EditorStyleHelper.blockView}-${options.role}`
  );
  for (const className of options.classNames ?? []) {
    dom.classList.add(className);
  }
  dom.dataset.blockNode = options.nodeName;
  dom.dataset.blockRole = options.role;
  setAttributes(dom, options.attrs);
}
