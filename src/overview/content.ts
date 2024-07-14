import { render } from "solid-js/web";
import { App } from "./ui";
import { initI18n } from "../i18n";

initI18n();

const container = document.createElement("div");
container.classList.add("row");
document
  .querySelector(".wide-background")
  ?.insertAdjacentElement("beforebegin", container);

const root = document.createElement("div");
container.appendChild(root);
render(App, root);
