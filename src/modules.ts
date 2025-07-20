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
      ects: number;
      description: string | null;
      bachelors: {
        [bachelor in keyof typeof BachelorType]?: BachelorModuleData;
      };
    };
  };
};
import { getModuleEdit } from "./storage";

type BachelorModuleData = {
  type: keyof typeof ModuleType;
  obligatory: boolean;
  majors?: (keyof typeof MajorType)[];
};

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

  // Look up hardcoded module data in extension
  let moduleData = getModuleData(semester, module, bachelor);

  // If the module doesn't exist in the chosen semester fall back to the semester it was completed
  moduleData ??= getModuleData(module.semester, module, bachelor);

  return calculateModuleType(module.shortName, moduleData, major);
}

function getModuleData(
  semester: Semester,
  module: Module,
  bachelor: BachelorType,
) {
  const semesterData = modulesData[formatSemester(semester)];
  if (semesterData == null) {
    return undefined;
  }
  const bachelorName = BachelorType[bachelor] as keyof typeof BachelorType;
  return semesterData[module.shortName]?.bachelors?.[bachelorName];
}

export function getSemesters(): Semester[] {
  return Object.keys(modulesData).map((x) => {
    return {
      part: x[0] == "H" ? "HS" : "FS",
      year: 2000 + Number.parseInt(x.substring(2)),
    };
  });
}

function calculateModuleType(
  shortName: string,
  bachelorData: BachelorModuleData | undefined,
  major: MajorType | undefined,
): ModuleType {
  // Special rules
  if (shortName.startsWith("BPRAXIS")) {
    return ModuleType.Extension;
  }
  if (shortName.includes("_TUT")) {
    return ModuleType.Misc;
  }

  // If we have no data at all default to an extension module
  if (!bachelorData) {
    return ModuleType.Extension;
  }

  let typeName = bachelorData.type;

  // Check if this is a major module for the chosen major
  if (major !== undefined) {
    const majorName = MajorType[major] as keyof typeof MajorType;
    if (bachelorData.majors?.includes(majorName) == true) {
      typeName = "Major";
    }
  }

  return ModuleType[typeName as keyof typeof ModuleType];
}

export function getAllModulesForSemester(
  semester: Semester,
  bachelor: BachelorType,
  major: MajorType | undefined,
) {
  const semesterKey = formatSemester(semester);
  const semesterData = modulesData[semesterKey];

  if (semesterData == null) {
    return [];
  }

  const bachelorName = BachelorType[bachelor] as keyof typeof BachelorType;
  const result: {
    shortName: string;
    type: ModuleType;
    ects: number;
    description: string;
  }[] = [];

  for (const moduleShortName in semesterData) {
    const moduleData = semesterData[moduleShortName];
    const bachelorData = moduleData.bachelors[bachelorName];

    if (!bachelorData) {
      continue;
    }

    const type = calculateModuleType(moduleShortName, bachelorData, major);
    result.push({
      shortName: moduleShortName,
      type: type,
      ects: moduleData.ects,
      description: moduleData.description ?? "",
    });
  }

  return result;
}
