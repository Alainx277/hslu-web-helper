//! Downloads and parses all the Modulbeschriebe PDFs to know which modules have which types (per bachelor program)

use std::{collections::HashMap, fmt::Display, process::exit, sync::OnceLock};

use eyre::{eyre, Context};
use itertools::Itertools;
use regex::Regex;
use reqwest::header;
use serde::{Deserialize, Serialize};

fn main() -> eyre::Result<()> {
    color_eyre::install()?;

    let args: Vec<String> = std::env::args().collect();
    let [_, token] = &args[..] else {
        println!(
            "Usage: {} <TOKEN>\nNote: the token cookie is called \".AspNet.Cookies\"",
            args.first().unwrap()
        );
        exit(2);
    };

    // Set auth cookie
    let mut headers = header::HeaderMap::new();
    headers.insert(
        "Cookie",
        header::HeaderValue::from_str(&format!(".AspNet.Cookies={}", token))
            .wrap_err("Error building auth cookie")?,
    );

    let client = reqwest::blocking::Client::builder()
        .default_headers(headers)
        .build()
        .unwrap();

    let mut modules: HashMap<String, Module> = Default::default();
    for bachelor in [Bachelor::ArtificialIntelligence, Bachelor::ComputerScience, Bachelor::CyberSecurity, Bachelor::Economics] {
        println!("--------------");
        println!("{:?}", bachelor);
        for result in process_bachelor(bachelor, &client)
            .wrap_err_with(|| format!("Error processing bachelor {:?}", bachelor))?
        {
            match result {
                Ok(m) => {
                    println!("Parsed {}", &m.name);
                    modules.entry(m.name.clone()).or_insert(m);
                }
                Err(err) => println!("Failed {:#}", err),
            }
        }

        println!("--------------");
    }

    // Load hardcoded data for broken modules :(
    match std::fs::read_to_string("extra_modules.json") {
        Ok(text) => {
            let extra_modules: HashMap<String, Module> = serde_json::from_str(&text)?;
            for (name, module) in extra_modules.into_iter() {
                println!("Using extra module definition {}", name);
                modules.insert(name, module);
            }
        },
        Err(err) => {
            match err.kind() {
                std::io::ErrorKind::NotFound => {}
                _ => return Err(err).wrap_err("Error opening extra_modules.json"),
            }

        },
    };

    // Serialize result as JSON
    let json =
        serde_json::to_string_pretty(&modules).wrap_err("Unable to serialize modules to JSON")?;
    std::fs::write("modules.json", json).wrap_err("Error writing modules.json")?;

    Ok(())
}

fn process_bachelor(
    bachelor: Bachelor,
    client: &reqwest::blocking::Client,
) -> eyre::Result<Vec<eyre::Result<Module>>> {
    let response = client
        .get(bachelor.url())
        .send()
        .wrap_err("Failed to send HTTP request")?;

    response
        .error_for_status_ref()
        .wrap_err("Server returned failure code")?;

    let response_url = response.url().clone();
    if response_url.as_str().contains("/login/") {
        return Err(eyre!("Auth token is invalid"));
    }

    let title_regex = Regex::new(r"\(([^)]+)\)").unwrap();

    let response_text = response.text()?;
    let dom =
        tl::parse(&response_text, Default::default()).wrap_err("Unable to decode HTML response")?;
    let parser = dom.parser();
    Ok(dom
        .query_selector("a.gtm-downloads")
        .unwrap()
        .flat_map(|handle| {
            // Extract href
            let link_tag = handle.get(parser).unwrap().as_tag()?;
            let link = link_tag.attributes().get("href")??.as_utf8_str();
            if !link.contains("/modulbeschriebe") {
                return None;
            }
            // Extract title
            let full_title = link_tag.attributes().get("title")??.as_utf8_str();
            let title = title_regex.captures(&full_title)?.get(1).unwrap().as_str();

            let full_url = match response_url.join(&link) {
                Ok(it) => it,
                Err(err) => return Some(Err(err).wrap_err("Error building full url")),
            };

            Some(
                download_module(client, title.to_string(), full_url.as_str())
                    .wrap_err_with(|| format!("Error processing module {}", title)),
            )
        })
        .collect())
}

fn download_module(
    client: &reqwest::blocking::Client,
    name: String,
    url: &str,
) -> eyre::Result<Module> {
    let response = client
        .get(url)
        .send()
        .wrap_err("Failed to send HTTP request")?;
    response
        .error_for_status_ref()
        .wrap_err("Server returned failure code")?;

    let bytes = response.bytes()?;
    let text = pdf_extract::extract_text_from_mem(&bytes)
        .wrap_err("Failed to extract text from module PDF")?;
    let m = parse_module(name, &text).wrap_err("Failed to parse module description")?;

    Ok(m)
}

#[derive(Debug, Clone)]
enum ParseModuleError {
    IncorrectDocument,
}

impl Display for ParseModuleError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ParseModuleError::IncorrectDocument => write!(f, "Not a valid module document"),
        }
    }
}
impl std::error::Error for ParseModuleError {}

fn module_split_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?:\s|^)(I|TA|DK|W)\b").unwrap())
}

fn module_parse_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"\S+ (Artificial Intelligence & Machine Learning|Information & Cyber Security|Informatik|Wirtschaftsinformatik|Mobility , Data Science & Economics|Digital Ideation|Wirtschaftsingenieurwesen|Elektrotechnik und Informationstechnologie|Digital Construction|Digital Engineering) (.*?) (Pflicht|Wahl|Mandatory|Elective)").unwrap()
    })
}

fn parse_module(name: String, text: &str) -> eyre::Result<Module> {
    // Find the module type table
    let start_match1 = " Major/Minor";
    let start_match2 = " Major";
    let start = text
        .find(start_match1)
        .map(|pos| pos + start_match1.len())
        .or_else(|| text.find(start_match2).map(|pos| pos + start_match2.len()))
        .ok_or(ParseModuleError::IncorrectDocument)?;
    let end = text[start..]
        .find("Modulverantwortlich")
        .or_else(|| text[start..].find("Module Coordinator"))
        .ok_or(ParseModuleError::IncorrectDocument)?
        + start;
    let relevant_text = &text[start..end];
    // Remove extra newlines
    let text_to_match = relevant_text.replace('\n', " ").replace("  ", " ");
    // Find the start of each table row (I did not find a better way)
    let split_re = module_split_regex();
    let positions: Vec<usize> = split_re
        .captures_iter(&text_to_match)
        .map(|c| c.get(0).unwrap().start())
        .chain(std::iter::once(text_to_match.len()))
        .collect();
    // Parse each row
    let parse_re = module_parse_regex();
    let offers: HashMap<Bachelor, ModuleOffer> = positions
        .iter()
        .copied()
        .tuple_windows()
        .flat_map(|(start, end)| {
            let target = &text_to_match[start..end];
            if let Some(captures) = parse_re.captures(target) {
                // Parse individual fields
                let bachelor = Bachelor::from_str(captures.get(1).unwrap().as_str())?;
                let ty = ModuleType::from_str(captures.get(2).unwrap().as_str())?;
                let obligatory =
                    matches!(captures.get(3).unwrap().as_str(), "Pflicht" | "Mandatory");
                Some((bachelor, ModuleOffer { ty, obligatory }))
            } else {
                println!("Failed to match {}", target);
                None
            }
        })
        .collect();

    Ok(Module { name, offers })
}

#[derive(Debug, Serialize, Deserialize)]
struct Module {
    #[serde(skip)]
    name: String,
    #[serde(flatten)]
    offers: HashMap<Bachelor, ModuleOffer>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ModuleOffer {
    #[serde(rename = "type")]
    ty: ModuleType,
    obligatory: bool,
}

#[derive(PartialEq, Eq, Hash, Debug, Clone, Copy, Serialize, Deserialize)]
enum Bachelor {
    CyberSecurity,
    ComputerScience,
    Economics,
    ArtificialIntelligence,
}

impl Bachelor {
    fn url(&self) -> &'static str {
        match self {
            Bachelor::CyberSecurity => "https://mycampus.hslu.ch/de-ch/info-i/infos-und-dokumente/bachelor/bachelor-allgemein/moduleinschreibung/modulbeschriebe/bachelor-in-information-and-cyber-security/",
            Bachelor::ComputerScience => "https://mycampus.hslu.ch/de-ch/info-i/infos-und-dokumente/bachelor/bachelor-allgemein/moduleinschreibung/modulbeschriebe/modulbeschriebe-studiengang-informatik/",
            Bachelor::Economics => "https://mycampus.hslu.ch/de-ch/info-i/infos-und-dokumente/bachelor/bachelor-allgemein/moduleinschreibung/modulbeschriebe/modulbeschriebe-wirtschaftsinformatik-neues-curriculum/",
            Bachelor::ArtificialIntelligence => "https://mycampus.hslu.ch/de-ch/info-i/infos-und-dokumente/bachelor/bachelor-allgemein/moduleinschreibung/modulbeschriebe/bachelor-artificial-intelligence-machine-learning/",
        }
    }

    fn from_str(str: &str) -> Option<Self> {
        match str {
            "Information & Cyber Security" => Some(Bachelor::CyberSecurity),
            "Wirtschaftsinformatik" => Some(Bachelor::Economics),
            "Artificial Intelligence & Machine Learning" => Some(Bachelor::ArtificialIntelligence),
            "Informatik" => Some(Bachelor::ComputerScience),
            // Hope you don't have these as your bachelor, lol
            "Digital Ideation"
            | "Wirtschaftsingenieurwesen"
            | "Elektrotechnik und Informationstechnologie"
            | "Mobility , Data Science & Economics"
            | "Digital Construction"
            | "Digital Engineering" => None,
            other => {
                println!("Error parsing bachelor {}", other);
                None
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
enum ModuleType {
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

impl ModuleType {
    fn from_str(str: &str) -> Option<Self> {
        Some(match str {
            "K" => ModuleType::Core,
            "P" => ModuleType::Project,
            "E" => ModuleType::Extension,
            "M" => ModuleType::Major,
            // I sure love consistent fields
            "M, E" => ModuleType::Major,
            "E, M" => ModuleType::Major,
            "Z" => ModuleType::Misc,
            other => {
                println!("Error parsing module type {}", other);
                return None;
            }
        })
    }
}
