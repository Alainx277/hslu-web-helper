import { FluentBundle, FluentResource, FluentVariable } from "@fluent/bundle";
// @ts-expect-error No types, is a text file
import de from "./locale/de-ch.ftl";
// @ts-expect-error No types, is a text file
import en from "./locale/en.ftl";

// Global translation function
export let t: (
  path: string,
  context?: Record<string, FluentVariable>,
) => string = (p) => p;

export function initI18n() {
  let locale = { name: "de-ch", source: de };

  if (window.location.pathname.includes("/en/")) {
    locale = { name: "en", source: en };
  }
  // If you don't speak german or english I am sorry that you need to take lectures here

  const bundle = new FluentBundle(locale.name);
  const errors = bundle.addResource(new FluentResource(locale.source));
  if (errors.length) {
    console.error(errors);
  }

  t = (p, c) => {
    const message = bundle.getMessage(p);
    if (message == null || message.value == null) {
      console.error("Missing translation ", p);
      return p;
    }

    return bundle.formatPattern(message.value, c);
  };
}
