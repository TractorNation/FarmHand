use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use tauri::{AppHandle, Manager};

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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApiError {
    pub message: String,
    pub error_type: String,
}

impl ApiError {
    pub fn new(message: String, error_type: String) -> Self {
        Self {
            message,
            error_type,
        }
    }

    pub fn network(message: String) -> Self {
        Self::new(message, "network".to_string())
    }

    pub fn api(message: String) -> Self {
        Self::new(message, "api".to_string())
    }

    pub fn parsing(message: String) -> Self {
        Self::new(message, "parsing".to_string())
    }

    pub fn filesystem(message: String) -> Self {
        Self::new(message, "filesystem".to_string())
    }
}

/// Fetches events for the current year from The Blue Alliance API.
pub async fn fetch_upcoming_events(api_key: &str) -> Result<Vec<TbaEvent>, ApiError> {
    let url = format!("{}/events/{}", TBA_BASE_URL, 2026);
    let client = Client::new();

    let response = client
        .get(&url)
        .header("X-TBA-Auth-Key", api_key)
        .send()
        .await
        .map_err(|e| ApiError::network(format!("Failed to connect to The Blue Alliance: {}", e)))?;

    let status = response.status();

    if !status.is_success() {
        return Err(ApiError::api(format!(
            "TBA API error ({}): {}",
            status.as_u16(),
            if status.as_u16() == 401 || status.as_u16() == 403 {
                "Invalid or missing API key"
            } else {
                "Server error or event not found"
            }
        )));
    }

    let events_text = response
        .text()
        .await
        .map_err(|e| ApiError::network(format!("Failed to read API response: {}", e)))?;

    let events: Vec<TbaEvent> = serde_json::from_str(&events_text)
        .map_err(|e| ApiError::parsing(format!("Failed to parse event data: {}", e)))?;

    Ok(events)
}

/// Attempts to load cached event data from the local filesystem
fn load_cached_event_data(app_handle: &AppHandle, event_key: &str) -> Result<EventData, ApiError> {
    let local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| ApiError::filesystem(format!("Cannot access app data directory: {}", e)))?;

    let file_path = local_data_dir.join(format!("{}_event_data.json", event_key));

    if !file_path.exists() {
        return Err(ApiError::filesystem(format!(
            "No cached data found for event '{}'",
            event_key
        )));
    }

    let file_content = fs::read_to_string(&file_path)
        .map_err(|e| ApiError::filesystem(format!("Failed to read cached event data: {}", e)))?;

    let event_data: EventData = serde_json::from_str(&file_content)
        .map_err(|e| ApiError::parsing(format!("Failed to parse cached event data: {}", e)))?;

    Ok(event_data)
}

/// Saves event data to the local filesystem
fn save_event_data(
    app_handle: &AppHandle,
    event_key: &str,
    event_data: &EventData,
) -> Result<(), ApiError> {
    let local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| ApiError::filesystem(format!("Cannot access app data directory: {}", e)))?;

    if !local_data_dir.exists() {
        fs::create_dir_all(&local_data_dir).map_err(|e| {
            ApiError::filesystem(format!("Failed to create app data directory: {}", e))
        })?;
    }

    let file_path = local_data_dir.join(format!("{}_event_data.json", event_key));

    let json_content = serde_json::to_string_pretty(event_data)
        .map_err(|e| ApiError::parsing(format!("Failed to serialize event data: {}", e)))?;

    fs::write(&file_path, json_content)
        .map_err(|e| ApiError::filesystem(format!("Failed to write event data to file: {}", e)))?;

    Ok(())
}

/// Fetches matches AND teams for a given event and saves them to a JSON file.
/// If the fetch fails (e.g., offline), attempts to load cached data.
/// Returns EventData containing both matches and teams, along with a flag indicating if data is cached.
pub async fn fetch_and_save_matches(
    app_handle: AppHandle,
    api_key: &str,
    event_key: &str,
) -> Result<(EventData, bool), ApiError> {
    // First, try to fetch fresh data from the API
    match fetch_event_data_from_api(api_key, event_key).await {
        Ok(event_data) => {
            // Successfully fetched - try to save it (but don't fail if save fails)
            if let Err(e) = save_event_data(&app_handle, event_key, &event_data) {
                eprintln!("Warning: Failed to cache event data: {}", e.message);
                // Continue anyway - we have the data
            }
            Ok((event_data, false)) // false = data is fresh, not cached
        }
        Err(fetch_error) => {
            // Fetch failed - try to load cached data
            eprintln!(
                "API fetch failed: {} - Attempting to load cached data",
                fetch_error.message
            );

            match load_cached_event_data(&app_handle, event_key) {
                Ok(cached_data) => {
                    // Successfully loaded cached data
                    Ok((cached_data, true)) // true = data is from cache
                }
                Err(cache_error) => {
                    // Both fetch and cache load failed
                    Err(ApiError::new(
                        format!(
                            "Failed to fetch event data ({}), and no cached data available ({})",
                            fetch_error.message, cache_error.message
                        ),
                        "combined".to_string(),
                    ))
                }
            }
        }
    }
}

/// Internal function to fetch event data from TBA API
async fn fetch_event_data_from_api(api_key: &str, event_key: &str) -> Result<EventData, ApiError> {
    let client = Client::new();

    // Fetch matches
    let matches_url = format!("{}/event/{}/matches", TBA_BASE_URL, event_key);

    let matches_response = client
        .get(&matches_url)
        .header("X-TBA-Auth-Key", api_key)
        .send()
        .await
        .map_err(|e| ApiError::network(format!("Failed to connect to TBA for matches: {}", e)))?;

    let matches_status = matches_response.status();
    let matches: Vec<TbaMatch> = if matches_status.is_success() {
        let text = matches_response
            .text()
            .await
            .map_err(|e| ApiError::network(format!("Failed to read matches response: {}", e)))?;
        serde_json::from_str(&text).unwrap_or_else(|_| vec![])
    } else if matches_status.as_u16() == 401 || matches_status.as_u16() == 403 {
        return Err(ApiError::api("Invalid or missing API key".to_string()));
    } else if matches_status.as_u16() == 404 {
        vec![] // Event might not have matches scheduled yet
    } else {
        return Err(ApiError::api(format!(
            "TBA API error ({}): Failed to fetch matches",
            matches_status.as_u16()
        )));
    };

    // Fetch teams
    let teams_url = format!("{}/event/{}/teams", TBA_BASE_URL, event_key);

    let teams_response = client
        .get(&teams_url)
        .header("X-TBA-Auth-Key", api_key)
        .send()
        .await
        .map_err(|e| ApiError::network(format!("Failed to connect to TBA for teams: {}", e)))?;

    let teams_status = teams_response.status();
    let teams: Vec<TbaTeam> = if teams_status.is_success() {
        let text = teams_response
            .text()
            .await
            .map_err(|e| ApiError::network(format!("Failed to read teams response: {}", e)))?;
        serde_json::from_str(&text).unwrap_or_else(|_| vec![])
    } else if teams_status.as_u16() == 401 || teams_status.as_u16() == 403 {
        return Err(ApiError::api("Invalid or missing API key".to_string()));
    } else if teams_status.as_u16() == 404 {
        return Err(ApiError::api(format!("Event '{}' not found", event_key)));
    } else {
        return Err(ApiError::api(format!(
            "TBA API error ({}): Failed to fetch teams",
            teams_status.as_u16()
        )));
    };

    if matches.is_empty() && teams.is_empty() {
        return Err(ApiError::api(format!(
            "No data available for event '{}' - event may not exist or has no scheduled matches/teams yet",
            event_key
        )));
    }

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

    // Add teams from teams list
    for team in &teams {
        team_keys_set.insert(team.key.clone());
    }

    let team_keys: Vec<String> = team_keys_set.into_iter().collect();

    Ok(EventData {
        matches,
        teams,
        team_keys,
    })
}
