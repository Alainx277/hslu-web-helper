import { For, createSignal } from "solid-js";
import { Module, ModuleState } from "../module";
import { t } from "../i18n";
import * as storage from "../storage";
import { ModuleEdit } from "../storage";

export const AddModuleModal = (props: { onClose: () => void }) => {
  const [shortName, setShortName] = createSignal("");
  const [ects, setEcts] = createSignal("");
  const [grade, setGrade] = createSignal("");
  const [semesterPart, setSemesterPart] = createSignal("HS");
  const [semesterYear, setSemesterYear] = createSignal(
    new Date().getFullYear().toString(),
  );
  const [state, setState] = createSignal(ModuleState.Passed);

  const states = Object.values(ModuleState);
  const stateValues = states.slice(0, states.length / 2);

  function handleSubmit(e: Event) {
    e.preventDefault();
    const newModule: Partial<Module> = {
      fullId: "manual-" + Date.now(),
      shortName: shortName(),
      ects: parseFloat(ects()),
      state: state(),
      semester: {
        part: semesterPart() as "FS" | "HS",
        year: parseInt(semesterYear()),
      },
    };

    if (grade()) {
      newModule.grade = grade();
    }

    const editModule: ModuleEdit = {
      fullId: newModule.fullId!,
      edits: newModule,
    };

    storage.editModule(editModule);
    props.onClose();
  }

  return (
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000">
      <div style="background: white; padding: 1em; border-radius: 4px; width: 300px">
        <h3>{t("module-manual-add")}</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>{t("module-short-name")}*</label>
            <input
              type="text"
              value={shortName()}
              onInput={(e) => setShortName(e.currentTarget.value)}
              required
            />
          </div>
          <div>
            <label>{t("header-ects")}*</label>
            <input
              type="number"
              value={ects()}
              onInput={(e) => setEcts(e.currentTarget.value)}
              required
            />
          </div>
          <div>
            <label>{t("header-grade")}</label>
            <input
              type="number"
              step="0.1"
              value={grade()}
              onInput={(e) => setGrade(e.currentTarget.value)}
            />
          </div>
          <div>
            <label>{t("header-semester")}*</label>
            <select
              value={semesterPart()}
              onChange={(e) => setSemesterPart(e.currentTarget.value)}
              required
            >
              <option value="HS">HS</option>
              <option value="FS">FS</option>
            </select>
          </div>
          <div>
            <label>{t("year")}*</label>
            <input
              type="number"
              value={semesterYear()}
              onInput={(e) => setSemesterYear(e.currentTarget.value)}
              required
            />
          </div>
          <div>
            <label>{t("header-state")}*</label>
            <select
              value={state()}
              onChange={(e) => setState(parseInt(e.currentTarget.value))}
            >
              <For each={stateValues}>
                {(s, i) => (
                  <option value={i()}>
                    {t(`module-state-${(s as string).toLowerCase()}`)}
                  </option>
                )}
              </For>
            </select>
          </div>
          <div style="margin-top: 1em; display: flex; justify-content: space-between;">
            <button type="button" onClick={props.onClose}>
              {t("cancel")}
            </button>
            <button type="submit">{t("add")}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
