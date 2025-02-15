import {
  BachelorType,
  formatSemester,
  MajorType,
  Module,
  ModuleType,
  Semester,
} from "./module";
import modulesDataRaw from "./modules.json";
const modulesData = modulesDataRaw as {
  [semester: string]: {
    [module: string]: {
      [bachelor in keyof typeof BachelorType]?: {
        type: keyof typeof ModuleType;
        obligatory: boolean;
        majors?: (keyof typeof MajorType)[];
      };
    };
  };
};
import { getModuleEdit } from "./storage";

export function getModuleType(
  semester: Semester,
  module: Module,
  bachelor: BachelorType,
  major: MajorType | undefined,
): ModuleType | null {
  // User has edited type
  const userType = getModuleEdit(module.fullId)?.edits.type;
  if (userType != undefined) {
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
  const semesterData = modulesData[formatSemester(semester)];
  const bachelorName = BachelorType[bachelor] as keyof typeof BachelorType;
  const moduleData = semesterData[module.shortName]?.[bachelorName];
  if (moduleData == undefined) {
    // Default to extension module
    return ModuleType.Extension;
  }

  let type = moduleData.type;
  // Check if this is a major module for the chosen major
  if (major != undefined) {
    const majorName = MajorType[major] as keyof typeof MajorType;
    if (moduleData.majors?.includes(majorName) == true) {
      type = ModuleType[ModuleType.Major] as keyof typeof ModuleType;
    }
  }

  // Stored module data will always have one of the valid module types
  return ModuleType[type as keyof typeof ModuleType];
}

export function getSemesters(): Semester[] {
  return Object.keys(modulesData).map((x) => {
    return {
      part: x[0] == "H" ? "HS" : "FS",
      year: 2000 + Number.parseInt(x.substring(2)),
    };
  });
}
