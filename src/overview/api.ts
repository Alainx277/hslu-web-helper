import {
  BACHELOR_MAJORS,
  BachelorType,
  MAJOR_NAMES,
  MajorType,
  Module,
  ModuleState,
  nextSemester,
  parseModuleId,
  previousSemester,
  semesterFromDate,
} from "../module";

const MODULE_URL = new URL(
  "https://mycampus.hslu.ch/de-ch/api/anlasslist/load/?datasourceid=5158ceaf-061f-49aa-b270-fc309c1a5f69&per_page=50",
);
const STUDY_URL = new URL(
  "https://mycampus.hslu.ch/de-ch/stud-i/mein-studium/meine-daten/",
);

export interface ApiModule {
  from: Date;
  to: Date;
  details: Detail[];
  anlassnumber: string;
  ects: string | null;
  iliasUrl: string;
  note: string | null;
  grade: string | null;
  title: string;
  text: string;
  link: string;
  prop1: Prop1[];
  id: string;
}

export interface Detail {
  key: null | string;
  val: string;
  pid?: string;
}

interface Prop1 {
  text: string;
}

// Fetches all modules related to the student
export async function fetchModules(): Promise<Module[]> {
  let currentPage = 1;
  let numPages = Number.POSITIVE_INFINITY;
  const modules: ApiModule[] = [];

  while (currentPage <= numPages) {
    const url = new URL(MODULE_URL);
    url.searchParams.append("page", currentPage.toString());

    const response = await fetch(url);
    const data = await response.json();
    numPages = data.numPages;
    modules.push(...data.items);

    currentPage++;
  }

  return modules
    .map(moduleFromApi)
    .filter((x): x is Exclude<typeof x, null> => x !== null);
}

function moduleFromApi(apiModule: ApiModule): Module | null {
  const data = parseModuleId(apiModule.anlassnumber);
  if (!data) {
    return null;
  }

  const { shortName, year, part: yearPart } = data;

  const currentSemester = semesterFromDate(new Date());
  // Parse module state from the (non-standard) comment
  let moduleState = ModuleState.NotApplicable;
  if (apiModule.prop1.length > 0) {
    const comment = apiModule.prop1[0].text.toLowerCase();
    if (comment.includes("erfolgreich")) {
      moduleState = comment.includes("nicht")
        ? ModuleState.Failed
        : ModuleState.Passed;
    } else if (comment.includes("testat")) {
      const previous = previousSemester(currentSemester);
      if (previous.year == year && previous.part == yearPart) {
        moduleState = ModuleState.Ongoing;
      }
    }
  }
  if (moduleState == ModuleState.NotApplicable) {
    // Module is currently running
    if (currentSemester.year == year && currentSemester.part == yearPart) {
      moduleState = ModuleState.Ongoing;
    } else {
      const next = nextSemester(currentSemester);
      // Module is in the next semester
      if (next.year == year && next.part == yearPart) {
        moduleState = ModuleState.Planned;
      }
    }
  }

  return {
    fullId: apiModule.anlassnumber,
    ects: apiModule.ects != null ? +apiModule.ects : null,
    grade: apiModule.note,
    state: moduleState,
    shortName: shortName,
    semester: { year, part: yearPart },
  };
}

export interface StudyInfo {
  bachelor: BachelorType;
  major: MajorType | undefined;
  partTime: boolean;
}

const BACHELOR_NAME: [string, BachelorType][] = [
  [
    "artificial intelligence & machine learning",
    BachelorType.ArtificialIntelligence,
  ],
  ["information & cyber security", BachelorType.CyberSecurity],
  ["wirtschaftsinformatik", BachelorType.Economics],
  ["digital ideation", BachelorType.DigitalIdeation],
];

export async function getStudyInfo(): Promise<StudyInfo> {
  const response = await fetch(STUDY_URL);
  const html = await response.text();
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(html, "text/html");
  const text = htmlDoc.body.innerText.toLowerCase();

  // Default to computer science
  let bachelor = BachelorType.ComputerScience;
  for (const [name, type] of BACHELOR_NAME) {
    if (text.includes(name)) {
      bachelor = type;
      break;
    }
  }

  // Try to find the major
  let major = undefined;
  for (const majorType of BACHELOR_MAJORS[bachelor]) {
    const name = MAJOR_NAMES[majorType];
    if (text.includes(name.toLowerCase())) {
      major = majorType;
      break;
    }
  }

  return {
    partTime: text.includes("berufsbegleitend"),
    bachelor,
    major,
  };
}
