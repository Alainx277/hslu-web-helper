import { Show, createEffect, createMemo, createResource } from "solid-js";
import {
  BACHELOR_CREDITS,
  BACHELOR_REQUIREMENTS,
  BachelorRequirement,
  BachelorType,
  Credits,
  creditStatistics,
  Module,
  ModuleState,
  ModuleType,
  Semester,
} from "../module";
import * as api from "./api";
import * as storage from "../storage";
import { getModuleType } from "../modules";
import AgGridSolid, { AgGridSolidRef } from "ag-grid-solid";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./style.css";
import { t } from "../i18n";

export const App = () => {
  storage.load();
  // Load modules from the API
  const [apiModules] = createResource(async () => {
    return await api.fetchModules();
  });

  const modules = createMemo(() => {
    const api = apiModules();
    if (api == null) {
      return null;
    }
    return storage.getUserModules(api);
  });

  const [studyInfo] = createResource(api.getStudyInfo);

  // Update the stored data
  createEffect(() => {
    const moduleList = modules();
    if (moduleList == null) {
      return;
    }
    const info = studyInfo();
    if (info == null) {
      return;
    }
    const localData = storage.localData();
    localData.modules = moduleList;
    localData.bachelor = info.bachelor;
    storage.updateLocalData(localData);
  });

  return (
    <>
      <Show
        when={modules() != null && !studyInfo.loading}
        fallback={<p>{t("loading")}</p>}
      >
        <h2>{t("requirements")}</h2>
        <Requirements
          bachelor={studyInfo()!.bachelor}
          modules={modules()!}
        ></Requirements>
        <h2>{t("modules")}</h2>
        <ModulesTableNew
          bachelor={studyInfo()!.bachelor}
          modules={modules()!}
        ></ModulesTableNew>
      </Show>
    </>
  );
};

const Requirements = (props: { bachelor: BachelorType; modules: Module[] }) => {
  const reqs = BACHELOR_REQUIREMENTS[props.bachelor];
  const statistics = createMemo(() =>
    creditStatistics(props.modules, props.bachelor),
  );

  return (
    <table class="requirements" style="table-layout: fixed">
      <thead>
        <tr>
          <th scope="col"></th>
          <th scope="col">{t("core-module")}</th>
          <th scope="col">{t("project-module")}</th>
          <th scope="col">{t("major-module")}</th>
          <th scope="col">{t("extension-module")}</th>
          <th scope="col">{t("misc-module")}</th>
          <th scope="col">{t("total")}</th>
        </tr>
      </thead>
      <tbody>
        <RequirementRow
          label={t("requirement-ongoing")}
          credits={statistics().ongoing}
          reqs={reqs}
        ></RequirementRow>
        <RequirementRow
          label={t("requirement-completed")}
          credits={statistics().done}
          reqs={reqs}
        ></RequirementRow>
      </tbody>
    </table>
  );
};

const RequirementRow = (props: {
  label: string;
  credits: Credits;
  reqs: BachelorRequirement;
}) => {
  return (
    <tr>
      <td>{props.label}</td>
      <RequirementCell
        value={props.credits.coreCredits}
        required={props.reqs.coreCredits}
      />
      <RequirementCell
        value={props.credits.projectCredits}
        required={props.reqs.projectCredits}
      />
      <RequirementCell
        value={props.credits.majorCredits}
        required={props.reqs.majorCredits}
      />
      <RequirementCell
        value={props.credits.extensionCredits}
        required={props.reqs.extensionCredits}
      />
      <RequirementCell
        value={props.credits.miscCredits}
        required={props.reqs.miscCredits}
      />
      <RequirementCell
        value={props.credits.totalCredits}
        required={BACHELOR_CREDITS}
      />
    </tr>
  );
};

const RequirementCell = (props: { value: number; required: number }) => {
  return (
    <td>
      <div>
        {props.value}/{props.required}
      </div>
      <progress
        style="max-width: 100%"
        value={props.value}
        max={props.required}
        data-fulfilled={props.value >= props.required}
      ></progress>
    </td>
  );
};

const ModulesTableNew = (props: {
  bachelor: BachelorType;
  modules: Module[];
}) => {
  let grid: AgGridSolidRef;

  const defaultColDef = {
    filterParams: {
      debounceMs: 100,
    },
    flex: 1,
  };

  const states = Object.values(ModuleState);
  const stateValues = states
    .slice(0, states.length / 2)
    .map((x) => t(`module-state-${(x as string).toLowerCase()}`));

  const types = Object.values(ModuleType);
  const typeValues = types
    .slice(0, types.length / 2)
    .map((x) => t(`module-type-${(x as string).toLowerCase()}`));

  const columnDefs = [
    {
      field: "shortName",
      headerName: t("header-module"),
      filter: "agTextColumnFilter",
      floatingFilter: true,
      flex: 1.5,
    },
    {
      field: "semester",
      headerName: t("header-semester"),
      filter: "agTextColumnFilter",
      floatingFilter: true,
      // valueGetter(params: { data: Module }) {
      //   return `${params.data.semester.part} ${params.data.semester.year}`;
      // },
      valueFormatter(params: { value: Semester }) {
        return `${params.value.part} ${params.value.year}`;
      },
      comparator(valueA: Semester, valueB: Semester) {
        if (valueA.year == valueB.year && valueA.part != valueB.part) {
          return valueA.part == "HS" ? -1 : 1;
        }

        return valueB.year - valueA.year;
      },
    },
    {
      field: "state",
      headerName: t("header-state"),
      filter: "agTextColumnFilter",
      floatingFilter: true,
      valueGetter(params: { data: Module }) {
        return t(
          `module-state-${ModuleState[params.data.state].toLowerCase()}`,
        );
      },
      filterValueGetter(params: { data: Module }) {
        return t(
          `module-state-${ModuleState[params.data.state].toLowerCase()}`,
        );
      },
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: stateValues,
      },
      valueSetter(params: { data: Module; newValue: string }): boolean {
        const index = stateValues.indexOf(params.newValue);
        if (index == -1) {
          console.error("unknown state value");
          return false;
        }

        storage.editModule({
          fullId: params.data.fullId,
          edits: {
            state: index,
          },
        });
        return false;
      },
    },
    {
      field: "type",
      headerName: t("header-type"),
      filter: "agTextColumnFilter",
      floatingFilter: true,
      valueGetter(params: { data: Module }) {
        const type = getModuleType(params.data, props.bachelor);
        if (type == null) {
          return "";
        }
        return t(`module-type-${ModuleType[type].toLowerCase()}`);
      },
      filterValueGetter(params: { data: Module }) {
        const type = getModuleType(params.data, props.bachelor);
        if (type == null) {
          return "";
        }
        return t(`module-type-${ModuleType[type].toLowerCase()}`);
      },
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: typeValues,
      },
      valueSetter(params: { data: Module; newValue: string }): boolean {
        const index = typeValues.indexOf(params.newValue);
        if (index == -1) {
          console.error("unknown type value");
          return false;
        }

        storage.editModule({
          fullId: params.data.fullId,
          edits: {
            type: index,
          },
        });
        return false;
      },
    },
    {
      field: "ects",
      headerName: t("header-ects"),
      flex: 0.5,
    },
    {
      field: "grade",
      headerName: t("header-grade"),
      flex: 0.5,
    },
    {
      headerName: t("header-actions"),
      cellRenderer: ActionsCell,
    },
  ];

  return (
    <div>
      <div class="ag-theme-alpine" style={{ height: "500px" }}>
        <AgGridSolid
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowData={props.modules}
          onFirstDataRendered={() => {
            /*grid.api.autoSizeAllColumns(); grid.api.sizeColumnsToFit();*/
          }}
          singleClickEdit={true}
          ref={
            // @ts-expect-error TS does not understand that the ref will initialize this variable
            grid
          }
        />
      </div>
      <a type="button" onclick={() => grid.api.exportDataAsCsv()}>
        {t("export-csv")}
      </a>
    </div>
  );
};

const ActionsCell = (props: { data: Module }) => {
  return (
    <Show when={storage.getModuleEdit(props.data.fullId)}>
      <div style="height: 100%; display: flex; align-items: center;">
        <a
          title={t("remove-edit")}
          onClick={() => storage.deleteModuleEdit(props.data.fullId)}
        >
          <i class="gg-remove-r"></i>
        </a>
      </div>
    </Show>
  );
};
