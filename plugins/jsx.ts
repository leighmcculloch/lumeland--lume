import { React, ReactDOMServer } from "../deps/react.ts";
import loader from "../core/loaders/module.ts";
import { merge } from "../core/utils.ts";

import type { Data, Engine, Helper, Site } from "../core.ts";

export interface Options {
  /** The list of extensions this plugin applies to */
  extensions:
    | string[]
    | {
      pages: string[];
      components: string[];
    };
}

// Default options
export const defaults: Options = {
  extensions: [".jsx", ".tsx"],
};

// JSX children type
export type Children = React.ReactNode | React.ReactNode[];

// Ensure React is available in the global scope
// so no need to import it in every file
window.React ||= React;

/** Template engine to render JSX files */
export class JsxEngine implements Engine {
  helpers: Record<string, Helper> = {};
  basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  deleteCache() {}

  async render(content: unknown, data: Data = {}) {
    // The content is a string, so we have to convert to a React element
    if (typeof content === "string") {
      content = React.createElement("div", {
        dangerouslySetInnerHTML: { __html: content },
      });
    }

    // Create the children property
    let children = data.content;

    // If the children is a string, convert it to a React element
    if (typeof children === "string") {
      children = React.createElement("div", {
        dangerouslySetInnerHTML: { __html: children },
      });
    }

    const element = typeof content === "object" && React.isValidElement(content)
      ? content
      : ((typeof content === "function"
        ? await content({ ...data, children }, this.helpers)
        : content) as React.ReactElement);

    if (React.isValidElement(element)) {
      return {
        ...element,
        toString: () => ReactDOMServer.renderToStaticMarkup(element),
      };
    }

    return element;
  }

  renderSync(content: unknown, data: Data = {}): { toString(): string } {
    const element = typeof content === "function"
      ? content(data, this.helpers)
      : content;

    if (React.isValidElement(element)) {
      return {
        ...element,
        toString: () => ReactDOMServer.renderToStaticMarkup(element),
      };
    }

    return element;
  }

  addHelper(name: string, fn: Helper) {
    this.helpers[name] = fn;
  }
}

/** Register the plugin to support JSX and TSX files */
export default function (userOptions?: Partial<Options>) {
  const options = merge(defaults, userOptions);
  const extensions = Array.isArray(options.extensions)
    ? { pages: options.extensions, components: options.extensions }
    : options.extensions;

  return (site: Site) => {
    const engine = new JsxEngine(site.src("/"));

    site.loadPages(extensions.pages, loader, engine);
    site.loadComponents(extensions.components, loader, engine);
  };
}
