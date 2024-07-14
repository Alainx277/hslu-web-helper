import { BachelorType, Module, ModuleType } from "./module";
import * as modulesData from "./modulesData.js";
import { getModuleEdit } from "./storage";

export function getModuleType(
  module: Module,
  bachelor: BachelorType,
): ModuleType | null {
  // User has edited type
  const userType = getModuleEdit(module.fullId)?.edits.type;
  if (userType) {
    return userType;
  }

  // Special rules
  if (module.shortName.startsWith("BPRAXIS")) {
    return ModuleType.Extension;
  }
  if (module.shortName.includes("_TUT")) {
    return ModuleType.Misc;
  }

  // Look up hardcoded module data in extension
  const type =
    modulesData.MODULES[module.shortName]?.[BachelorType[bachelor]]?.type;
  // Stored module data will always have one of the valid module types
  return ModuleType[type as keyof typeof ModuleType];
}
