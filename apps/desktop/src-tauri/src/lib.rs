use serde::{Deserialize, Serialize};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_store::StoreExt;

const AGENT_PORT: &str = "17200";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub llm_base_url: String,
    #[serde(default)]
    pub llm_model: String,
    #[serde(default)]
    pub dida365_mcp_url: String,
    #[serde(default)]
    pub llm_api_key: String,
    #[serde(default)]
    pub dida365_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialsPublic {
    pub llm_api_key: String,
    pub dida365_token: String,
    pub llm_base_url: String,
    pub llm_model: String,
    pub dida365_mcp_url: String,
}

pub struct SidecarState(Mutex<Option<Child>>);

fn kill_process_on_port(port: &str) {
    let _ = Command::new("sh")
        .args([
            "-c",
            &format!("lsof -ti:{port} | xargs kill -9 2>/dev/null || true"),
        ])
        .status();
}

fn load_settings(app: &tauri::AppHandle) -> Result<AppSettings, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    Ok(store
        .get("settings")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default())
}

fn save_settings(app: &tauri::AppHandle, settings: &AppSettings) -> Result<(), String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set("settings", serde_json::to_value(settings).unwrap());
    store.save().map_err(|e| e.to_string())
}

fn normalize_settings(settings: AppSettings) -> AppSettings {
    AppSettings {
        llm_base_url: if settings.llm_base_url.trim().is_empty() {
            "https://api.openai.com/v1".into()
        } else {
            settings.llm_base_url.trim().to_string()
        },
        llm_model: if settings.llm_model.trim().is_empty() {
            "gpt-4o-mini".into()
        } else {
            settings.llm_model.trim().to_string()
        },
        dida365_mcp_url: if settings.dida365_mcp_url.trim().is_empty() {
            "https://mcp.dida365.com".into()
        } else {
            settings.dida365_mcp_url.trim().to_string()
        },
        llm_api_key: settings.llm_api_key.trim().to_string(),
        dida365_token: settings.dida365_token.trim().to_string(),
    }
}

fn settings_to_public(settings: AppSettings) -> CredentialsPublic {
    let s = normalize_settings(settings);
    CredentialsPublic {
        llm_api_key: s.llm_api_key,
        dida365_token: s.dida365_token,
        llm_base_url: s.llm_base_url,
        llm_model: s.llm_model,
        dida365_mcp_url: s.dida365_mcp_url,
    }
}

#[tauri::command]
fn get_credentials(app: tauri::AppHandle) -> Result<CredentialsPublic, String> {
    Ok(settings_to_public(load_settings(&app)?))
}

#[tauri::command]
fn save_credentials(
    app: tauri::AppHandle,
    llm_api_key: String,
    dida365_token: String,
    llm_base_url: String,
    llm_model: String,
    dida365_mcp_url: String,
) -> Result<(), String> {
    let settings = normalize_settings(AppSettings {
        llm_base_url,
        llm_model,
        dida365_mcp_url,
        llm_api_key,
        dida365_token,
    });
    save_settings(&app, &settings)
}

#[tauri::command]
fn get_agent_url() -> String {
    format!("http://127.0.0.1:{AGENT_PORT}")
}

fn collect_ancestor_dirs(start: &std::path::Path) -> Vec<std::path::PathBuf> {
    let mut roots = Vec::new();
    let mut dir = Some(start);
    while let Some(current) = dir {
        roots.push(current.to_path_buf());
        dir = current.parent();
    }
    roots
}

fn project_roots() -> Vec<std::path::PathBuf> {
    let mut roots = collect_ancestor_dirs(std::path::Path::new(env!("CARGO_MANIFEST_DIR")));

    if let Ok(cwd) = std::env::current_dir() {
        roots.extend(collect_ancestor_dirs(&cwd));
    }

    roots.sort();
    roots.dedup();
    roots
}

fn resolve_agent_entry() -> Result<(std::path::PathBuf, std::path::PathBuf), String> {
    for root in project_roots() {
        let dist = root.join("packages/agent-runtime/dist/server.js");
        if dist.exists() {
            return Ok((root, dist));
        }
        let src = root.join("packages/agent-runtime/src/server.ts");
        if src.exists() {
            return Ok((root, src));
        }
    }
    Err(format!(
        "找不到 agent 入口文件，已搜索: {}",
        project_roots()
            .iter()
            .map(|p| p.display().to_string())
            .collect::<Vec<_>>()
            .join(", ")
    ))
}

fn spawn_sidecar(app: &tauri::AppHandle, state: &SidecarState) -> Result<(), String> {
    kill_process_on_port(AGENT_PORT);

    let settings = normalize_settings(load_settings(app)?);

    let (project_root, agent_path) = resolve_agent_entry()?;
    let is_dist = agent_path.extension().is_some_and(|e| e == "js");

    let mut cmd = if is_dist {
        let mut c = Command::new("node");
        c.arg(&agent_path);
        c
    } else {
        let tsx = project_root.join("node_modules/.bin/tsx");
        if tsx.exists() {
            let mut c = Command::new(tsx);
            c.arg(&agent_path);
            c
        } else {
            let mut c = Command::new("pnpm");
            c.args(["exec", "tsx", agent_path.to_string_lossy().as_ref()]);
            c
        }
    };

    cmd.current_dir(&project_root);
    cmd.env("TOKA_AGENT_PORT", AGENT_PORT);
    cmd.env("LLM_BASE_URL", &settings.llm_base_url);
    cmd.env("LLM_MODEL", &settings.llm_model);
    cmd.env("LLM_API_KEY", &settings.llm_api_key);
    cmd.env("DIDA365_TOKEN", &settings.dida365_token);
    cmd.env("DIDA365_MCP_URL", &settings.dida365_mcp_url);
    cmd.stdout(Stdio::null());
    cmd.stderr(Stdio::piped());

    let child = cmd.spawn().map_err(|e| format!("启动 sidecar 失败: {e}"))?;

    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(mut old) = guard.take() {
        let _ = old.kill();
    }
    *guard = Some(child);
    Ok(())
}

#[tauri::command]
async fn start_sidecar(
    app: tauri::AppHandle,
    state: State<'_, SidecarState>,
) -> Result<String, String> {
    spawn_sidecar(&app, &state)?;
    tokio::time::sleep(std::time::Duration::from_millis(1200)).await;
    Ok(get_agent_url())
}

#[tauri::command]
async fn restart_sidecar(
    app: tauri::AppHandle,
    state: State<'_, SidecarState>,
) -> Result<String, String> {
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
        }
    }
    spawn_sidecar(&app, &state)?;
    tokio::time::sleep(std::time::Duration::from_millis(1200)).await;
    Ok(get_agent_url())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(SidecarState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            get_credentials,
            save_credentials,
            get_agent_url,
            start_sidecar,
            restart_sidecar,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let state = handle.state::<SidecarState>();
                let _ = start_sidecar(handle.clone(), state).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
