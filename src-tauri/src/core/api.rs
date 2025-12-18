use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use tauri::{AppHandle, Error, Manager};

const TBA_BASE_URL: &str = "https://www.thebluealliance.com/api/v3";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TbaEvent {
    pub key: String,
    pub name: String,
    pub short_name: Option<String>,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TbaTeam {
    pub key: String,
    pub team_number: u32,
    pub nickname: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TbaMatch {
    pub key: String,
    pub comp_level: String,
    pub match_number: u32,
    pub alliances: Alliances,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Alliances {
    pub red: Alliance,
    pub blue: Alliance,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Alliance {
    pub team_keys: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EventData {
    pub matches: Vec<TbaMatch>,
    pub teams: Vec<TbaTeam>,
    pub team_keys: Vec<String>,
}

/// Fetches events for the current year from The Blue Alliance API.
pub async fn fetch_upcoming_events(api_key: &str) -> Result<Vec<TbaEvent>, Error> {
    let url = format!("{}/events/{}", TBA_BASE_URL, 2026);
    let client = reqwest::Client::new();

    let response = client
        .get(&url)
        .header("X-TBA-Auth-Key", api_key)
        .send()
        .await
        .expect("Failed to send request to TBA API");

    let events_text = response
        .text()
        .await
        .expect("Failed to parse events from TBA response");
    let events: Vec<TbaEvent> =
        serde_json::from_str(&events_text).expect("Failed to parse response to data type");

    Ok(events)
}

/// Fetches matches AND teams for a given event and saves them to a JSON file in the app's local data directory.
/// Returns EventData containing both matches and teams.
pub async fn fetch_and_save_matches(
    app_handle: AppHandle,
    api_key: &str,
    event_key: &str,
) -> Result<EventData, Error> {
    let client = reqwest::Client::new();

    // Fetch matches
    let matches_url = format!("{}/event/{}/matches", TBA_BASE_URL, event_key);
    let matches_response = client
        .get(&matches_url)
        .header("X-TBA-Auth-Key", api_key)
        .send()
        .await
        .expect("Failed to send match request to TBA API");

    let matches: Vec<TbaMatch> = if matches_response.status().is_success() {
        let matches_text = matches_response
            .text()
            .await
            .expect("Failed to parse matches JSON from TBA response");
        serde_json::from_str(&matches_text).unwrap_or_else(|_| vec![])
    } else {
        vec![]
    };

    // Fetch teams
    let teams_url = format!("{}/event/{}/teams", TBA_BASE_URL, event_key);
    let teams_response = client
        .get(&teams_url)
        .header("X-TBA-Auth-Key", api_key)
        .send()
        .await
        .expect("Failed to send teams request to TBA API");

    let teams: Vec<TbaTeam> = if teams_response.status().is_success() {
        let teams_text = teams_response
            .text()
            .await
            .expect("Failed to parse teams JSON from TBA response");
        serde_json::from_str(&teams_text).unwrap_or_else(|_| vec![])
    } else {
        vec![]
    };

    // Create a unified team_keys list
    let mut team_keys_set: HashSet<String> = HashSet::new();

    // Add teams from matches
    for match_data in &matches {
        for team_key in &match_data.alliances.red.team_keys {
            team_keys_set.insert(team_key.clone());
        }
        for team_key in &match_data.alliances.blue.team_keys {
            team_keys_set.insert(team_key.clone());
        }
    }

    // Add teams from teams list (ensures we get all teams even if no matches)
    for team in &teams {
        team_keys_set.insert(team.key.clone());
    }

    let team_keys: Vec<String> = team_keys_set.into_iter().collect();

    let event_data = EventData {
        matches,
        teams,
        team_keys,
    };

    // Save the EventData to a file
    let local_data_dir = app_handle.path().app_local_data_dir().unwrap();

    if !local_data_dir.exists() {
        fs::create_dir_all(&local_data_dir)?;
    }
    let file_path = local_data_dir.join(format!("{}_event_data.json", event_key));

    fs::write(
        &file_path,
        serde_json::to_string_pretty(&event_data).expect("Failed to serialize event data"),
    )
    .expect("Failed to write event data to file");

    Ok(event_data)
}
