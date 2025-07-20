#!/usr/bin/env python3
# Downloads module data from the HSLU API for all semesters starting at the given semester,
# and transforms them into the correct format, saving the result to src/modules.json

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
        sorted_result[module] = result[module]
        sorted_departments = {}
        for dept in sorted(result[module]["bachelors"].keys()):
            dept_info = result[module]["bachelors"][dept]
            # Sort majors if they exist
            if "majors" in dept_info:
                sorted_majors = sorted(dept_info["majors"])
                dept_info["majors"] = sorted_majors
            sorted_departments[dept] = dept_info
        sorted_result[module]["bachelors"] = sorted_departments
    return sorted_result

def map_department(department, short_name, logger):
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
        logger.warning(f"Unknown department: '{department}'. Skipping this offer for '{short_name}'.")
        return None

def map_module_type(module_type, short_name, logger):
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
        logger.warning(f"Unknown ModuleType: '{module_type}'. Skipping this offer for '{short_name}'.")
        return None, None

def extract_majors(offered_classes, short_name, logger):
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
    for lecture in offered_classes:
        lookup = lecture.replace("ma", "m")
        if lookup in class_major_mapping:
            majors.append(class_major_mapping[lookup])
        elif lecture.startswith("m"):
            logger.warning(f"Unknown Major: '{lecture}'. Skipping this major for '{short_name}'.")
    return majors

def fetch_semester_data(semester, logger):
    url = f"https://hslu-study-data.ch/api/v1/semesters/{semester}/modules"
    headers = {"X-Access-Key": "44f9a67d3b6d540c474f6c6d126fedde"}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.exceptions.HTTPError as http_err:
        # If it's a 404, return None so we know to stop.
        if response.status_code == 404:
            logger.warning(f"No data found for semester '{semester}' (404). Stopping iteration.")
            return None
        else:
            logger.error(f"HTTP error for semester '{semester}': {http_err}")
            return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch data for semester '{semester}': {e}")
        return None

    try:
        data = response.json()
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response for semester '{semester}': {e}")
        return None

    modules_data = data.get("data", [])
    if not isinstance(modules_data, list):
        logger.error(f"Expected 'data' key to contain a list for semester '{semester}'.")
        return None

    # Process modules
    result = {}
    preamble_regex = re.compile(r"^\d+_", re.IGNORECASE)
    for module in modules_data:
        try:
            short_name: str = module.get("ShortName", "")
            if short_name.endswith("_MM"):
                short_name = short_name[:-3]
            short_name = preamble_regex.sub("", short_name)
            if not short_name:
                logger.warning("Module missing 'ShortName'. Skipping this module.")
                continue

            if short_name not in result:
                result[short_name] = {
                    "ects": int(module.get("Ects", "0")),
                    "description": module.get("Description", ""),
                    "bachelors": {}
                }

            module_offers = module.get("ModuleOffers", [])
            if not isinstance(module_offers, list):
                logger.warning(f"Module '{short_name}' has invalid 'ModuleOffers'. Skipping this module.")
                continue

            for offer in module_offers:
                department_raw = offer.get("DegreeProgramme", "")
                module_type_raw = offer.get("ModuleType", "")
                offered_classes = offer.get("OfferedToClasses", [])

                mapped_dept = map_department(department_raw, short_name, logger)
                if not mapped_dept:
                    continue

                mapped_type, is_obligatory = map_module_type(module_type_raw, short_name, logger)
                if mapped_type is None:
                    continue

                majors = extract_majors(offered_classes, short_name, logger)

                if mapped_dept not in result[short_name]:
                    result[short_name]["bachelors"][mapped_dept] = {
                        "type": mapped_type,
                        "obligatory": is_obligatory
                    }

                if majors:
                    existing_majors = result[short_name]["bachelors"][mapped_dept].get("majors", [])
                    # Avoid duplicate majors
                    combined_majors = list(set(existing_majors + majors))
                    result[short_name]["bachelors"][mapped_dept]["majors"] = combined_majors

        except Exception as e:
            logger.error(f"Error processing module '{module.get('ShortName', 'Unknown')}' for semester '{semester}': {e}")

    return sort_result(result)

def increment_semester(semester):
    prefix = semester[0]   # 'H' or 'F'
    year_str = semester[1:]
    year = int(year_str)

    if prefix.upper() == 'F':
        # Next is H of the same year
        return f"H{year_str}"
    else:
        # Next is F of the following year
        next_year = year + 1
        # Keep the same zero-padding, e.g. '02' -> '03'
        next_year_str = str(next_year).zfill(len(year_str))
        return f"F{next_year_str}"

def api_semester_to_extension(semester):
    # Extension uses HS and FS instead of H and F
    return semester[:1] + 'S' + semester[1:]

def main():
    setup_logging()
    logger = logging.getLogger()

    if len(sys.argv) < 2:
        logger.error("Usage: python script.py <starting_semester>")
        sys.exit(1)

    start_semester = sys.argv[1].strip()
    if not re.match(r'^[HF]\d{2}$', start_semester, re.IGNORECASE):
        logger.error(f"Invalid semester format '{start_semester}'. Must be Hxx or Fxx (e.g., H23).")
        sys.exit(1)

    all_semesters_data = {}
    current_semester = start_semester

    while True:
        data = fetch_semester_data(current_semester, logger)
        if data is None:
            # We either got a 404 or some other failure - stop the loop
            break
        all_semesters_data[api_semester_to_extension(current_semester)] = data
        # Move to the next semester
        current_semester = increment_semester(current_semester)

    if not all_semesters_data:
        logger.warning("No semester data was fetched. Exiting without writing file.")
        sys.exit(0)

    try:
        with open("src/modules.json", "w", encoding="utf-8") as outfile:
            json.dump(all_semesters_data, outfile, indent=2, ensure_ascii=False)
        print("src/modules.json has been created.")
    except IOError as e:
        logger.error(f"Failed to write to 'modules.json': {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
