use napi::bindgen_prelude::*;
use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

const RECORD_SIZE: usize = 3255;
const DEFAULT_PATH: &str = ".core/core.uem";

fn ensure_core(path: &Path) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if !path.exists() {
        File::create(path)?;
    }
    Ok(())
}

fn core_path(path: Option<String>) -> PathBuf {
    path.map(PathBuf::from).unwrap_or_else(|| PathBuf::from(DEFAULT_PATH))
}

#[napi]
pub fn record_size() -> u32 {
    RECORD_SIZE as u32
}

#[napi]
pub fn genesis(path: Option<String>) -> Result<()> {
    let p = core_path(path);
    ensure_core(&p).map_err(|e| Error::from_reason(e.to_string()))?;
    Ok(())
}

#[napi]
pub fn append_quantum(record: Buffer, path: Option<String>) -> Result<u32> {
    if record.len() != RECORD_SIZE {
        return Err(Error::from_reason(format!(
            "invalid record size {}, expected {}",
            record.len(),
            RECORD_SIZE
        )));
    }
    let p = core_path(path);
    ensure_core(&p).map_err(|e| Error::from_reason(e.to_string()))?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&p)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    file.write_all(&record)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    Ok(RECORD_SIZE as u32)
}

#[napi]
pub fn read_all(path: Option<String>) -> Result<Vec<Buffer>> {
    let p = core_path(path);
    ensure_core(&p).map_err(|e| Error::from_reason(e.to_string()))?;
    let mut file = File::open(&p).map_err(|e| Error::from_reason(e.to_string()))?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    let mut out = Vec::new();
    let mut off = 0usize;
    while off + RECORD_SIZE <= buf.len() {
        let slice = &buf[off..off + RECORD_SIZE];
        out.push(Buffer::from(slice.to_vec()));
        off += RECORD_SIZE;
    }
    Ok(out)
}
