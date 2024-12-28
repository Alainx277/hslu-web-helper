#!/usr/bin/env python3
# Downloads module data from the HSLU API and transforms it into the correct format

import sys
import requests
import json
import logging
import re

def setup_logging():
    logging.basicConfig(
        level=logging.WARNING,
        format='%(levelname)s: %(message)s'
    )

def sort_result(result):
    sorted_result = {}
    for module in sorted(result.keys()):
        sorted_departments = {}
        for dept in sorted(result[module].keys()):
            dept_info = result[module][dept]
            # Sort majors if they exist
            if "majors" in dept_info:
                sorted_majors = sorted(dept_info["majors"])
                dept_info["majors"] = sorted_majors
            sorted_departments[dept] = dept_info
        sorted_result[module] = sorted_departments
    return sorted_result

def main():
    setup_logging()

    if len(sys.argv) < 2:
        logging.error("Usage: python script.py <semester>")
        sys.exit(1)
    semester = sys.argv[1]

    url = f"https://hslu-study-data.ch/api/v1/semesters/{semester}/modules"
    headers = {"X-Access-Key": "44f9a67d3b6d540c474f6c6d126fedde"}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to fetch data from API: {e}")
        sys.exit(1)

    try:
        data = response.json()
    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse JSON response: {e}")
        sys.exit(1)

    modules_data = data.get("data", [])
    if not isinstance(modules_data, list):
        logging.error("Expected 'data' key to contain a list.")
        sys.exit(1)


    def map_department(department, short_name):
        department_mapping = {
            "Informatik": "ComputerScience",
            "Information & Cyber Security": "CyberSecurity",
            "Wirtschaftsinformatik": "Economics",
            "Artificial Intelligence & Machine Learning": "ArtificialIntelligence",
            "Digital Ideation": "DigitalIdeation",
        }
        if department in department_mapping:
            return department_mapping[department]
        else:
            logging.warning(f"Unknown department: '{department}'. Skipping this offer for '{short_name}'.")
            return None

    def map_module_type(module_type, short_name):
        module_type_mapping = {
            "Kernmodul": ("Core", True),
            "Erweiterungsmodul": ("Extension", False),
            "Major-/Minormodul": ("Extension", False),
            "Projektmodul": ("Project", False),
            "Zusatzmodul": ("Misc", False),
        }
        if module_type in module_type_mapping:
            return module_type_mapping[module_type]
        else:
            logging.warning(f"Unknown ModuleType: '{module_type}'. Skipping this offer for '{short_name}'.")
            return None, None

    def extract_majors(offered_classes, short_name):
        majors = []
        class_major_mapping = {
            "mAV": "ArtificialIntelligenceVisualComputing",
            "mRO": "ArtificialIntelligenceRobotics",
            "mSF": "DigitalForensic",
            "mSM": "InformationSecurityManagement",
            "mOS": "ItOperationSecurity",
            "mBA": "BusinessAnalysis",
            "miCS": "InformationCyberSecurity",
            "mHC": "HumanComputerInteractionDesign",
            "mDS": "DataScienceDataEngineering",
            "mSP": "AttackPentester",
            "mST": "InformationSecurityTechnologie",
            "mSC": "CloudMobileIot",
            "miAR": "ArtificialIntelligenceRoboticsMinor",
            "miMH": "MedtechHealthcare",
            "mVR": "AugmentedVirtualReality",
            "miSE": "SoftwareEngineering",
            "mDB": "DigitalBusiness",
            "mSE": "SoftwareEngineeringDevops",
            "mSD": "SoftwareDevelopment",
        }
        for cls in offered_classes:
            if cls in class_major_mapping:
                majors.append(class_major_mapping[cls])
            elif cls.startswith("m"):
                logging.warning(f"Unknown Major: '{cls}'. Skipping this major for '{short_name}'.")
        return majors

    result = {}

    preamble_regex = re.compile(r"^\d+_", re.IGNORECASE)
    for module in modules_data:
        try:
            short_name: str = module.get("ShortName", "")
            if short_name.endswith("_MM"):
                short_name = short_name[:-3]
            short_name = preamble_regex.sub("", short_name)
            if not short_name:
                logging.warning("Module missing 'ShortName'. Skipping this module.")
                continue

            if short_name not in result:
                result[short_name] = {}

            module_offers = module.get("ModuleOffers", [])
            if not isinstance(module_offers, list):
                logging.warning(f"Module '{short_name}' has invalid 'ModuleOffers'. Skipping this module.")
                continue

            for offer in module_offers:
                department_raw = offer.get("DegreeProgramme", "")
                module_type_raw = offer.get("ModuleType", "")
                offered_classes = offer.get("OfferedToClasses", [])

                mapped_dept = map_department(department_raw, short_name)
                if not mapped_dept:
                    continue

                mapped_type, is_obligatory = map_module_type(module_type_raw, short_name)
                if mapped_type is None:
                    continue

                majors = extract_majors(offered_classes, short_name)

                if mapped_dept not in result[short_name]:
                    result[short_name][mapped_dept] = {
                        "type": mapped_type,
                        "obligatory": is_obligatory
                    }

                if majors:
                    existing_majors = result[short_name][mapped_dept].get("majors", [])
                    # Avoid duplicate majors
                    combined_majors = list(set(existing_majors + majors))
                    result[short_name][mapped_dept]["majors"] = combined_majors

        except Exception as e:
            logging.error(f"Error processing module '{module.get('ShortName', 'Unknown')}': {e}")

    # Sort the result to make it diffable
    sorted_result = sort_result(result)

    try:
        with open("src/modules.json", "w", encoding="utf-8") as outfile:
            json.dump(sorted_result, outfile, indent=2, ensure_ascii=False)
        print("src/modules.json has been created.")
    except IOError as e:
        logging.error(f"Failed to write to 'modules.json': {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
