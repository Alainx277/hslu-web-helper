import { initI18n, t } from "../i18n";
import {
  BACHELOR_REQUIREMENTS,
  creditStatistics,
  ModuleState,
  ModuleType,
  moduleTypeToCreditsKey,
  parseModuleId,
} from "../module";
import { load, loadLocalData, localData } from "../storage";
import "./style.css";

class ModuleElement {
  element: HTMLElement;
  titleElement: HTMLElement;
  fullId: string;

  constructor(element: HTMLElement) {
    this.element = element;
    this.titleElement = this.element.querySelector(".item-title span")!;
    this.fullId = this.titleElement.textContent?.trim() ?? "";
  }

  private addTitleText(text: string): void {
    const newSpan = document.createElement("span");
    newSpan.textContent = text;
    newSpan.style.fontSize = "1rem";
    this.titleElement.insertAdjacentElement("afterend", newSpan);
  }

  markState(state: ModuleState): void {
    if (this.element.dataset.state) {
      return;
    }

    if (state == ModuleState.Passed) {
      this.addTitleText(` (${t("completed")})`);
      this.element.dataset.completed = "true";
    } else if (state == ModuleState.Ongoing) {
      this.addTitleText(` (${t("ongoing")})`);
      this.element.dataset.ongoing = "true";
    }

    this.element.dataset.state = "true";
  }
}

function getTabModules(): ModuleElement[] {
  const anlassInfoElements =
    document.querySelectorAll<HTMLElement>(".anlass-info");
  return Array.from(anlassInfoElements).map(
    (element) => new ModuleElement(element),
  );
}

// Function to handle wizard navigation changes
async function handleTabChanged(): Promise<void> {
  const tabModules = getTabModules();
  const { modules, bachelor } = localData();

  // Process all modules
  for (const module of modules) {
    tabModules
      .filter((x) => parseModuleId(x.fullId)?.shortName == module.shortName)
      .forEach((x) => x.markState(module.state));
  }

  // Add indicator for required credits
  const availableSubtitle = document.querySelector(
    ".wizard-tab-container:not([aria-hidden]) .available-modules .callout h4",
  );
  if (availableSubtitle && bachelor != null) {
    let type = null;
    switch (availableSubtitle.textContent) {
      case "Kernmodule":
        type = ModuleType.Core;
        break;
      case "Projektmodule":
        type = ModuleType.Project;
        break;
      case "Erweiterungsmodule":
        type = ModuleType.Extension;
        break;
      case "Majormodule":
        type = ModuleType.Major;
        break;
      case "Zusatzmodule":
        type = ModuleType.Misc;
        break;
    }
    if (type != null) {
      const { ongoing } = creditStatistics(modules, bachelor);
      const current = ongoing[moduleTypeToCreditsKey(type)];
      const required =
        BACHELOR_REQUIREMENTS[bachelor][moduleTypeToCreditsKey(type)];

      const reportProgress = (
        after: Element,
        current: number,
        required: number,
      ) => {
        const existingElement = after.parentElement!.querySelector("p");
        const textElement = existingElement ?? document.createElement("p");
        const done = current >= required;
        textElement.textContent = `${current} / ${required} credits${done ? " 🎉" : ""}`;
        if (done) {
          textElement.style.color = "green";
        } else {
          textElement.style.removeProperty("color");
        }
        after.insertAdjacentElement("afterend", textElement);
      };

      reportProgress(availableSubtitle, current, required);

      // Show progress combined with selected modules
      const selectedModulesContainer = document.querySelector(
        ".wizard-tab-container:not([aria-hidden]) .main-modules",
      );
      if (selectedModulesContainer != null) {
        const additionalCredits = Array.from(
          selectedModulesContainer.querySelectorAll(
            ".anlass-info-non-unique .anlass-label",
          ),
        )
          .filter((x) => x.textContent?.toLowerCase()?.includes("ects"))
          .flatMap((x) => x.nextElementSibling?.textContent ?? [])
          .map((x) => Number.parseInt(x))
          .reduce((a, b) => a + b, 0);
        const selectedSubtitle =
          selectedModulesContainer.querySelector(".callout h4");
        if (selectedSubtitle != null) {
          reportProgress(
            selectedSubtitle,
            current + additionalCredits,
            required,
          );
        }
      }
    }
  }
}

function observeTabs(): void {
  const navigation = document.querySelector(".wizard-navigation");
  if (navigation) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          const target = mutation.target as HTMLElement;
          if (
            target.ariaHidden == null &&
            target.classList.contains("wizard-tab-container")
          ) {
            setTimeout(handleTabChanged, 500);
            break;
          }
        }
      }
    });

    observer.observe(navigation, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-hidden"],
    });

    handleTabChanged();
  } else {
    console.error("Navigation element not found");
  }
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

function observeModules(): void {
  const handleMutation = debounce(() => {
    handleTabChanged();
  }, 50);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        const addedNodes = Array.from(mutation.addedNodes);
        const removedNodes = Array.from(mutation.removedNodes);

        const hasAnlassInfoClass = (node: Node): boolean => {
          return (
            node instanceof Element &&
            Array.from(node.classList).some(
              (cls) => cls.startsWith("anlass-info") || cls == "module-info",
            )
          );
        };

        if (
          addedNodes.some(hasAnlassInfoClass) ||
          removedNodes.some(hasAnlassInfoClass)
        ) {
          handleMutation();
          break;
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

initI18n();
load();
loadLocalData();
setTimeout(observeModules, 1000);
setTimeout(observeTabs, 1000);
