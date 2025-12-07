use once_cell::sync::Lazy;
use serde::de::DeserializeOwned;
use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

pub static SPEC: Lazy<Specs> = Lazy::new(|| Specs::load());

const JIWOL_TOTAL_DIGITS: usize = 20;

#[derive(Debug, Clone)]
pub struct Specs {
    pub jiwol: JiwolSpec,
    pub gggm: GggmSpec,
    pub ahs: AhsSpec,
    pub scd: ScdSpec,
    pub uem: UemSpec,
    layout: Vec<JiwolLayoutEntry>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct JiwolSpec {
    pub digits: Vec<usize>,
    pub fields: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(default)]
pub struct GggmSpec {
    pub ops: HashMap<String, String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(default)]
pub struct AhsSpec {
    pub alpha: f32,
    pub metric: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(default)]
pub struct ScdSpec {
    pub goal: String,
    pub trigger_bytes: usize,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(default)]
pub struct UemSpec {
    pub record: RecordSpec,
    pub ledger: LedgerSpec,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(default)]
pub struct RecordSpec {
    pub size_bytes: usize,
    pub id_len: usize,
    pub semantic_vec_len: usize,
    pub hash: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(default)]
pub struct LedgerSpec {
    pub path: String,
    pub append_only: bool,
    pub chain: bool,
}

#[derive(Debug, Clone)]
pub struct JiwolLayoutEntry {
    pub field: CoordField,
    pub digits: usize,
}

#[derive(Debug, Clone, Copy)]
pub enum CoordField {
    T,
    X,
    J,
    A,
    W,
    K,
    P,
    M,
    C,
}

impl Default for JiwolSpec {
    fn default() -> Self {
        Self {
            digits: vec![6, 4, 4, 1, 1, 1, 1, 1, 1],
            fields: vec![
                "t".into(),
                "x".into(),
                "j".into(),
                "a".into(),
                "w".into(),
                "k".into(),
                "p".into(),
                "m".into(),
                "c".into(),
            ],
        }
    }
}

impl Default for GggmSpec {
    fn default() -> Self {
        let mut ops = HashMap::new();
        ops.insert("merge".into(), "non-idempotent associative".into());
        ops.insert("parallel".into(), "independent composition".into());
        ops.insert("project".into(), "layer projection".into());
        ops.insert("tau".into(), "thickness measure".into());
        Self { ops }
    }
}

impl Default for AhsSpec {
    fn default() -> Self {
        Self { alpha: 0.8, metric: "state delta norm".into() }
    }
}

impl Default for ScdSpec {
    fn default() -> Self {
        Self { goal: "bounded growth; margin preserved".into(), trigger_bytes: 200 * 1024 * 1024 }
    }
}

impl Default for UemSpec {
    fn default() -> Self {
        Self { record: RecordSpec::default(), ledger: LedgerSpec::default() }
    }
}

impl Default for RecordSpec {
    fn default() -> Self {
        Self { size_bytes: 3255, id_len: 20, semantic_vec_len: 768, hash: "blake3".into() }
    }
}

impl Default for LedgerSpec {
    fn default() -> Self {
        Self { path: ".core/core.uem".into(), append_only: true, chain: true }
    }
}

impl Specs {
    fn load() -> Self {
        let dir = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let spec_root = dir.join(".core/spec");

        let jiwol = load_toml(&spec_root.join("jiwol.toml"), JiwolSpec::default());
        let gggm = load_toml(&spec_root.join("gggm.toml"), GggmSpec::default());
        let ahs = load_toml(&spec_root.join("ahs.toml"), AhsSpec::default());
        let scd = load_toml(&spec_root.join("scd.toml"), ScdSpec::default());
        let uem = load_toml(&spec_root.join("uem.toml"), UemSpec::default());

        let layout = build_layout(&jiwol);

        Specs { jiwol, gggm, ahs, scd, uem, layout }
    }

    pub fn jiwo_layout(&self) -> &[JiwolLayoutEntry] {
        &self.layout
    }
}

fn build_layout(spec: &JiwolSpec) -> Vec<JiwolLayoutEntry> {
    let mut entries = Vec::new();
    for (field, digits) in spec.fields.iter().zip(spec.digits.iter()) {
        if let Some(coord) = CoordField::from_str(field) {
            entries.push(JiwolLayoutEntry { field: coord, digits: *digits });
        }
    }
    let total: usize = entries.iter().map(|entry| entry.digits).sum();
    if total != JIWOL_TOTAL_DIGITS {
        entries.clear();
        entries.extend_from_slice(&default_layout());
    }
    entries
}

fn default_layout() -> [JiwolLayoutEntry; 9] {
    [
        JiwolLayoutEntry { field: CoordField::T, digits: 6 },
        JiwolLayoutEntry { field: CoordField::X, digits: 4 },
        JiwolLayoutEntry { field: CoordField::J, digits: 4 },
        JiwolLayoutEntry { field: CoordField::A, digits: 1 },
        JiwolLayoutEntry { field: CoordField::W, digits: 1 },
        JiwolLayoutEntry { field: CoordField::K, digits: 1 },
        JiwolLayoutEntry { field: CoordField::P, digits: 1 },
        JiwolLayoutEntry { field: CoordField::M, digits: 1 },
        JiwolLayoutEntry { field: CoordField::C, digits: 1 },
    ]
}

fn load_toml<T: DeserializeOwned + Default>(path: &Path, default: T) -> T {
    if let Ok(content) = fs::read_to_string(path) {
        toml::from_str(&content).unwrap_or(default)
    } else {
        default
    }
}

impl CoordField {
    pub fn from_str(value: &str) -> Option<Self> {
        match value.to_lowercase().as_str() {
            "t" => Some(CoordField::T),
            "x" => Some(CoordField::X),
            "j" => Some(CoordField::J),
            "a" => Some(CoordField::A),
            "w" => Some(CoordField::W),
            "k" => Some(CoordField::K),
            "p" => Some(CoordField::P),
            "m" => Some(CoordField::M),
            "c" => Some(CoordField::C),
            _ => None,
        }
    }
}
