import { createSignal } from "solid-js";
import {
  BachelorType,
  MajorType,
  Module,
  ModuleType,
  Semester,
} from "./module";

interface Settings {
  moduleEdits: ModuleEdit[];
  semester?: Semester | null;
  bachelor?: BachelorType | null;
}

interface ModuleEdit {
  fullId: string;
  edits: Partial<Module & { type: ModuleType }>;
}

const [settings, setSettings] = createSignal<Settings>({
  moduleEdits: [],
  semester: null,
  bachelor: null,
});

export async function updateSemester(semester: Semester | null) {
  const current = settings();
  const newSettings = Object.assign({}, current);
  newSettings.semester = semester;
  setSettings(newSettings);
  await save();
}

export async function updateBachelor(bachelor: BachelorType | null) {
  const current = settings();
  const newSettings = Object.assign({}, current);
  newSettings.bachelor = bachelor;
  setSettings(newSettings);
  await save();
}

export async function editModule(edit: ModuleEdit) {
  const current = settings();

  const existingEdit = current.moduleEdits.find((x) => x.fullId == edit.fullId);
  edit.edits.ects ??= existingEdit?.edits?.ects;
  edit.edits.grade ??= existingEdit?.edits?.grade;
  edit.edits.semester ??= existingEdit?.edits?.semester;
  edit.edits.state ??= existingEdit?.edits?.state;
  edit.edits.type ??= existingEdit?.edits?.type;

  const newEdits = current.moduleEdits.filter((x) => x.fullId != edit.fullId);
  newEdits.push(edit);
  const newSettings = Object.assign({}, current);
  newSettings.moduleEdits = newEdits;

  setSettings(newSettings);
  await save();
}

export function getModuleEdit(fullId: string): ModuleEdit | undefined {
  return settings().moduleEdits.find((x) => x.fullId == fullId);
}

export async function deleteModuleEdit(fullId: string) {
  const current = settings();
  const newEdits = current.moduleEdits.filter((x) => x.fullId != fullId);
  const newSettings = Object.assign({}, current);
  newSettings.moduleEdits = newEdits;

  setSettings(newSettings);
  await save();
}

export function getUserModules(apiModules: Module[]): Module[] {
  const current = settings();
  return apiModules.map((module) => {
    const edit = current.moduleEdits.find((x) => x.fullId == module.fullId);
    if (!edit) {
      return module;
    }

    // Apply edits
    return {
      fullId: module.fullId,
      shortName: edit.edits.fullId ?? module.shortName,
      ects: edit.edits.ects === undefined ? module.ects : edit.edits.ects,
      state: edit.edits.state ?? module.state,
      grade: edit.edits.grade === undefined ? module.grade : edit.edits.grade,
      semester: edit.edits.semester ?? module.semester,
    };
  });
}

export async function updateSettings(settings: Settings) {
  setSettings(settings);
  await save();
}

export { settings };

export async function load(): Promise<void> {
  const loaded = await chrome.runtime.sendMessage({ type: "loadSettings" });
  if (isEmpty(loaded)) {
    return;
  }
  setSettings(loaded);
}

export async function save() {
  await chrome.runtime.sendMessage({
    type: "saveSettings",
    settings: settings(),
  });
}

// Storage for temporary data

interface LocalData {
  modules: Module[];
  bachelor: BachelorType;
  major: MajorType | undefined;
}

const [localData, setLocalData] = createSignal<LocalData>({
  modules: [],
  bachelor: BachelorType.CyberSecurity,
  major: undefined,
});

export async function loadLocalData(): Promise<void> {
  const loaded = await chrome.runtime.sendMessage({ type: "loadLocal" });
  if (isEmpty(loaded)) {
    return;
  }
  setLocalData(loaded);
}

export async function saveLocalData() {
  await chrome.runtime.sendMessage({ type: "saveLocal", session: localData() });
}

export async function updateLocalData(session: LocalData) {
  setLocalData(session);
  await saveLocalData();
}

export { localData };

// JavaScript is a great language
function isEmpty(obj: object): boolean {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}
