import { getModuleType } from "./modules.js";

export interface Module {
  fullId: string;
  shortName: string;
  ects: number | null;
  state: ModuleState;
  grade: string | null;
  semester: Semester;
}

export function parseModuleId(
  full: string,
): { shortName: string; year: number; part: "FS" | "HS" } | null {
  const nameRegex = /^[^.]+\.(?:[^_.]+_)?([^.]+?)(?:_K)?\.([FH])?(\d\d)\d\d$/;
  const match = nameRegex.exec(full);
  if (!match) {
    return null;
  }

  const shortName = match[1];
  // If you use this software after 2099 the world is probably in a terrible state
  const year = 2000 + +match[3];
  const yearPart = (match[2] || "H") == "H" ? "HS" : "FS";

  return {
    shortName,
    year,
    part: yearPart,
  };
}

export enum ModuleState {
  Ongoing,
  Planned,
  Passed,
  Failed,
  NotApplicable,
}

export interface Semester {
  year: number;
  part: "FS" | "HS";
}

// Returns the starting semester
// Assumes the modules array is sorted in reverse time order
export function startingSemester(modules: Module[]): Semester {
  for (let index = modules.length - 1; index >= 0; index--) {
    const module = modules[index];
    if (module.ects != null) {
      return Object.assign({}, module.semester);
    }
  }

  // What the hell are you doing if you don't
  // do any credits in the first semester???
  return modules[modules.length - 1].semester;
}

export function semesterFromDate(date: Date): Semester {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (month >= 2 && month <= 8) {
    // From february to august FS
    return {
      year: year,
      part: "FS",
    };
  } else {
    // From september to january HS
    return {
      // If we are in january, the semester started last year
      year: month >= 9 ? year : year - 1,
      part: "HS",
    };
  }
}

export function nextSemester(current: Semester): Semester {
  switch (current.part) {
    case "FS":
      return { part: "HS", year: current.year };
    case "HS":
      return { part: "FS", year: current.year + 1 };
    default:
      const exhaustiveCheck: never = current.part;
      throw new Error(
        `Invalid semester part ${exhaustiveCheck}, this is a bug.}`,
      );
  }
}

export interface BachelorRequirement {
  // Kernmodul
  coreCredits: number;
  // Projektmodul
  projectCredits: number;
  // Erweiterungsmodul
  extensionCredits: number;
  // Zusatzmodul
  miscCredits: number;

  // Majormodul, optional
  majorCredits: number;
  totalCredits: number;

  mandatoryModules?: string[];
}

export enum BachelorType {
  CyberSecurity,
  ComputerScience,
  Economics,
  ArtificialIntelligence,
}

type EnumDictionary<T extends string | symbol | number, U> = {
  [K in T]: U;
};

export const BACHELOR_REQUIREMENTS: EnumDictionary<
  BachelorType,
  BachelorRequirement
> = {
  [BachelorType.CyberSecurity]: {
    coreCredits: 69,
    projectCredits: 42,
    extensionCredits: 51,
    miscCredits: 6,
    majorCredits: 24,
    totalCredits: 180,
  },
  [BachelorType.ComputerScience]: {
    coreCredits: 66,
    projectCredits: 42,
    extensionCredits: 57,
    miscCredits: 9,
    majorCredits: 24,
    totalCredits: 180,
  },
  [BachelorType.Economics]: {
    coreCredits: 60,
    projectCredits: 42,
    extensionCredits: 57,
    miscCredits: 9,
    majorCredits: 24,
    totalCredits: 180,
  },
  [BachelorType.ArtificialIntelligence]: {
    coreCredits: 105,
    projectCredits: 39,
    extensionCredits: 24,
    miscCredits: 6,
    majorCredits: 15,
    totalCredits: 180,
  },
};

export enum ModuleType {
  // Kernmodul
  Core,
  // Projektmodul
  Project,
  // Erweiterungsmodul
  Extension,
  // Zusatzmodul
  Misc,
  // Majormodul
  Major,
}

export const BACHELOR_CREDITS: number = 180;

export interface Credits {
  coreCredits: number;
  projectCredits: number;
  majorCredits: number;
  extensionCredits: number;
  miscCredits: number;
  totalCredits: number;
}

export interface CreditsStatistic {
  done: Credits;
  ongoing: Credits;
}

// Calculate how many credits are completed or planned
export function creditStatistics(
  modules: Module[],
  bachelor: BachelorType,
): CreditsStatistic {
  const ongoing: Credits = {
    coreCredits: 0,
    projectCredits: 0,
    majorCredits: 0,
    extensionCredits: 0,
    miscCredits: 0,
    totalCredits: 0,
  };
  const done = Object.assign({}, ongoing);

  for (const module of modules) {
    if (!module.ects) {
      continue;
    }

    const type = getModuleType(module, bachelor);
    if (type == null) {
      continue;
    }

    const passed = module.state == ModuleState.Passed;
    if (passed) {
      assignCredits(done, module.ects, type);
    }
    if (passed || module.state == ModuleState.Ongoing) {
      assignCredits(ongoing, module.ects, type);
    }
  }

  return { done, ongoing: ongoing };
}

function assignCredits(credits: Credits, amount: number, type: ModuleType) {
  switch (type) {
    case ModuleType.Core:
      credits.coreCredits += amount;
      break;
    case ModuleType.Project:
      credits.projectCredits += amount;
      break;
    case ModuleType.Major:
      credits.majorCredits += amount;
    // no break because major credits also count as extension credits
    case ModuleType.Extension:
      credits.extensionCredits += amount;
      break;
    case ModuleType.Misc:
      credits.miscCredits += amount;
      break;
    default:
      const exhaustiveCheck: never = type;
      throw new Error(`Invalid module type ${exhaustiveCheck}, this is a bug.`);
  }
  credits.totalCredits += amount;
}

// I enjoy static typing, how did you know?
export function moduleTypeToCreditsKey(type: ModuleType): keyof Credits {
  switch (type) {
    case ModuleType.Core:
      return "coreCredits";
    case ModuleType.Project:
      return "projectCredits";
    case ModuleType.Major:
      return "majorCredits";
    case ModuleType.Extension:
      return "extensionCredits";
    case ModuleType.Misc:
      return "miscCredits";
    default:
      const exhaustiveCheck: never = type;
      throw new Error(`Invalid module type ${exhaustiveCheck}, this is a bug.`);
  }
}
