// UEM Engine with NAPI bindings - restored and enhanced
pub mod ahs;
pub mod complex;
pub mod coord;
pub mod gggm;
pub mod hypervisor;
pub mod jiwol_id;
pub mod ledger;
pub mod quantum;
pub mod scd;
pub mod spec;
pub mod uem_tree;

use crate::ahs::validate_evolution;
use crate::coord::Coord9;
use crate::jiwol_id::{decode_coord, encode_coord, JiwolId};
use crate::ledger::Ledger;
use crate::quantum::{UemQuantum, RECORD_SIZE, SEM_LEN};
use crate::scd::scd_compact;
use crate::uem_tree::{QueryFilter, UemTree};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use napi::JsObject;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum EngineError {
    #[error("IO error: {0}")]
    Io(String),
    #[error("Invalid size")]
    InvalidSize,
    #[error("AHS violation")]
    AhsViolation,
    #[error("Invalid encoding")]
    InvalidEncoding,
    #[error("Invalid hash")]
    InvalidHash,
}

impl From<EngineError> for Error {
    fn from(e: EngineError) -> Self {
        Error::from_reason(e.to_string())
    }
}

static NEXT_HANDLE: AtomicU32 = AtomicU32::new(1);
static LEDGERS: Lazy<Mutex<HashMap<u32, Ledger>>> = Lazy::new(|| Mutex::new(HashMap::new()));

pub fn genesis_quantum() -> UemQuantum {
    let mut q = UemQuantum::default();
    q.payload_hash = hash_bytes(b"GENESIS");
    q.state_snapshot = q.payload_hash;
    q.prev_hash = [0u8; 32];
    q
}

pub fn hash_bytes(data: &[u8]) -> [u8; 32] {
    let mut h = blake3::Hasher::new();
    h.update(data);
    let out = h.finalize();
    *out.as_bytes()
}

impl UemQuantum {
    pub fn to_coord_filter(&self) -> QueryFilter {
        QueryFilter {
            t_min: Some(self.coord.t),
            t_max: Some(self.coord.t),
            j: Some(self.coord.j),
            k: Some(self.coord.k),
        }
    }
}

// NAPI-specific API functions
#[napi]
pub fn open_ledger(path: Option<String>) -> Result<u32> {
    let pb = path.map(PathBuf::from).unwrap_or_else(|| PathBuf::from(".core/core.uem"));
    let ledger = Ledger::open_with_genesis(pb, genesis_quantum())
        .map_err(|e| Error::from_reason(format!("Failed to open ledger: {}", e)))?;

    let handle = NEXT_HANDLE.fetch_add(1, Ordering::SeqCst);
    let mut map = LEDGERS.lock().map_err(|e| Error::from_reason(format!("Mutex error: {}", e)))?;
    map.insert(handle, ledger);

    Ok(handle)
}

#[napi]
pub fn close_ledger(handle: u32) -> Result<()> {
    let mut map = LEDGERS.lock().map_err(|e| Error::from_reason(format!("Mutex error: {}", e)))?;
    map.remove(&handle);
    Ok(())
}

#[napi]
pub fn append_quantum_external(handle: u32, record: Buffer) -> Result<()> {
    if record.len() != RECORD_SIZE {
        return Err(Error::from_reason("Invalid record size".to_string()));
    }

    let mut quantum = *bytemuck::from_bytes::<UemQuantum>(&record);

    let mut map = LEDGERS.lock().map_err(|e| Error::from_reason(format!("Mutex error: {}", e)))?;
    let ledger = map.get_mut(&handle)
        .ok_or_else(|| Error::from_reason("Ledger handle not found".to_string()))?;

    if let Some(last) = ledger.records.last() {
        if !validate_evolution(last, &quantum) {
            return Err(Error::from_reason("AHS violation".to_string()));
        }
        quantum.prev_hash = last.hash();
    }

    ledger.append(&quantum)
        .map_err(|e| Error::from_reason(format!("Failed to append quantum: {}", e)))?;

    Ok(())
}

#[napi]
pub fn get_records_count(handle: u32) -> Result<u32> {
    let map = LEDGERS.lock().map_err(|e| Error::from_reason(format!("Mutex error: {}", e)))?;
    let ledger = map.get(&handle)
        .ok_or_else(|| Error::from_reason("Ledger handle not found".to_string()))?;

    Ok(ledger.records.len() as u32)
}

#[napi]
pub fn validate_ledger(handle: u32) -> Result<bool> {
    let map = LEDGERS.lock().map_err(|e| Error::from_reason(format!("Mutex error: {}", e)))?;
    let ledger = map.get(&handle)
        .ok_or_else(|| Error::from_reason("Ledger handle not found".to_string()))?;

    Ok(ledger.validate_chain())
}

#[napi(object)]
pub struct QuantumInfo {
    pub id: Vec<u16>,
    pub timestamp: BigInt,
    pub payload_hash: String,
    pub prev_hash: String,
}

#[napi]
pub fn get_last_quantum_info(handle: u32) -> Result<QuantumInfo> {
    let map = LEDGERS.lock().map_err(|e| Error::from_reason(format!("Mutex error: {}", e)))?;
    let ledger = map.get(&handle)
        .ok_or_else(|| Error::from_reason("Ledger handle not found".to_string()))?;

    let last = ledger.records.last()
        .ok_or_else(|| Error::from_reason("No records in ledger".to_string()))?;

    Ok(QuantumInfo {
        id: last.id.to_vec(),
        timestamp: last.coord.t.into(),
        payload_hash: hex::encode(last.payload_hash),
        prev_hash: hex::encode(last.prev_hash),
    })
}

// NAPI Functions
#[napi]
pub fn record_size() -> u32 {
    RECORD_SIZE as u32
}

#[napi]
pub fn genesis_quantum_js() -> Buffer {
    let q = genesis_quantum();
    Buffer::from(q.to_bytes())
}

#[napi]
pub fn parse_quantum(buf: Buffer) -> Result<Buffer> {
    let q = UemQuantum::from_bytes(&buf)
        .ok_or_else(|| Error::from_reason("invalid record".to_string()))?;
    Ok(Buffer::from(q.to_bytes()))
}

#[napi]
pub fn quantum_hash(buf: Buffer) -> Result<String> {
    let q = UemQuantum::from_bytes(&buf)
        .ok_or_else(|| Error::from_reason("invalid record".to_string()))?;
    let hash = q.hash();
    Ok(hex::encode(hash))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_genesis_quantum() {
        let q = genesis_quantum();
        assert_eq!(q.coord.p, 1); // Genesis has p=1
        assert!(q.payload_hash != [0; 32]);
    }

    #[test]
    fn test_quantum_hash() {
        let q = genesis_quantum();
        let hash = q.hash();
        assert_eq!(hash.len(), 32);
        assert!(hash != [0; 32]);
    }

    #[test]
    fn test_ledger_operations() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("test.uem");

        let mut engine = UemEngine::new(Some(path.to_string_lossy().to_string())).unwrap();

        // Check genesis exists
        let records = engine.get_records().unwrap();
        assert_eq!(records.len(), 1);

        // Add another quantum
        let mut q = genesis_quantum();
        q.coord.t = 1;
        engine.append_quantum(q).unwrap();

        // Verify chain
        assert!(engine.validate_chain().unwrap());
    }

    #[test]
    fn test_to_bytes_from_bytes() {
        let q = genesis_quantum();
        let bytes = q.to_bytes();
        assert_eq!(bytes.len(), RECORD_SIZE);

        let q2 = UemQuantum::from_bytes(&bytes).unwrap();
        assert_eq!(q.hash(), q2.hash());
    }
}