pub mod ahs;
pub mod complex;
pub mod coord;
pub mod jiwol_id;
pub mod ledger;
pub mod quantum;
pub mod scd;
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
use once_cell::sync::Lazy;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use thiserror::Error;

static NEXT_HANDLE: AtomicU32 = AtomicU32::new(1);
static LEDGERS: Lazy<Mutex<HashMap<u32, Ledger>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Error, Debug)]
enum EngineError {
    #[error("io: {0}")]
    Io(String),
    #[error("invalid record size")]
    InvalidSize,
    #[error("ahs violation")]
    AhsViolation,
    #[error("ledger missing")]
    MissingLedger,
}

impl From<EngineError> for Error {
    fn from(e: EngineError) -> Self {
        Error::from_reason(e.to_string())
    }
}

pub fn genesis_quantum() -> UemQuantum {
    let mut q = UemQuantum::default();
    q.payload_hash = hash_bytes(b"GENESIS");
    q
}

pub fn hash_bytes(data: &[u8]) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(data);
    let out = h.finalize();
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&out);
    arr
}

fn to_buffer(q: &UemQuantum) -> Buffer {
    Buffer::from(q.to_bytes())
}

fn from_buffer(buf: Buffer) -> Result<UemQuantum> {
    UemQuantum::from_bytes(&buf).ok_or_else(|| Error::from_reason("invalid record".to_string()))
}

fn get_ledger(handle: u32) -> Result<std::sync::MutexGuard<'static, HashMap<u32, Ledger>>> {
    Ok(LEDGERS.lock().map_err(|e| Error::from_reason(e.to_string()))?)
}

#[napi]
pub fn record_size() -> u32 {
    RECORD_SIZE as u32
}

#[napi]
pub fn append_quantum(record: Buffer, path: Option<String>) -> Result<u32> {
    if record.len() != RECORD_SIZE {
        return Err(EngineError::InvalidSize.into());
    }
    let mut q = UemQuantum::from_bytes(&record).ok_or(EngineError::InvalidSize)?;
    let pb = path.map(PathBuf::from).unwrap_or_else(|| PathBuf::from(".core/core.uem"));
    let mut ledger = Ledger::open(pb, genesis_quantum()).map_err(|e| EngineError::Io(e.to_string()))?;
    if let Some(last) = ledger.records.last() {
        if !validate_evolution(last, &q) {
            return Err(EngineError::AhsViolation.into());
        }
    }
    ledger.append(q).map_err(|e| EngineError::Io(e.to_string()))?;
    Ok(RECORD_SIZE as u32)
}

#[napi]
pub fn read_all(path: Option<String>) -> Result<Vec<Buffer>> {
    let pb = path.map(PathBuf::from).unwrap_or_else(|| PathBuf::from(".core/core.uem"));
    let ledger = Ledger::open(pb, genesis_quantum()).map_err(|e| EngineError::Io(e.to_string()))?;
    let out = ledger.records.iter().map(to_buffer).collect();
    Ok(out)
}

#[napi]
pub fn genesis(path: Option<String>) -> Result<()> {
    let pb = path.map(PathBuf::from).unwrap_or_else(|| PathBuf::from(".core/core.uem"));
    Ledger::open(pb, genesis_quantum()).map_err(|e| EngineError::Io(e.to_string()))?;
    Ok(())
}

#[napi(object)]
pub struct JsCoordFilter {
    pub t_min: Option<u64>,
    pub t_max: Option<u64>,
    pub j: Option<u64>,
    pub k: Option<u32>,
}

#[napi]
pub fn open_ledger(path: Option<String>) -> Result<u32> {
    let pb = path.map(PathBuf::from).unwrap_or_else(|| PathBuf::from(".core/core.uem"));
    let ledger = Ledger::open(pb, genesis_quantum()).map_err(|e| EngineError::Io(e.to_string()))?;
    let handle = NEXT_HANDLE.fetch_add(1, Ordering::SeqCst);
    let mut map = LEDGERS.lock().map_err(|e| Error::from_reason(e.to_string()))?;
    map.insert(handle, ledger);
    Ok(handle)
}

#[napi]
pub fn append_record(handle: u32, record: Buffer) -> Result<()> {
    let mut map = LEDGERS.lock().map_err(|e| Error::from_reason(e.to_string()))?;
    let ledger = map.get_mut(&handle).ok_or(EngineError::MissingLedger)?;
    let mut q = from_buffer(record)?;
    if let Some(last) = ledger.records.last() {
        if !validate_evolution(last, &q) {
            return Err(EngineError::AhsViolation.into());
        }
        q.prev_hash = last.hash();
    }
    ledger.append(q).map_err(|e| EngineError::Io(e.to_string()))?;
    Ok(())
}

#[napi]
pub fn validate_chain_handle(handle: u32) -> Result<bool> {
    let map = LEDGERS.lock().map_err(|e| Error::from_reason(e.to_string()))?;
    let ledger = map.get(&handle).ok_or(EngineError::MissingLedger)?;
    Ok(ledger.validate_chain())
}

#[napi]
pub fn query_records(handle: u32, filter: Option<JsCoordFilter>) -> Result<Vec<Buffer>> {
    let map = LEDGERS.lock().map_err(|e| Error::from_reason(e.to_string()))?;
    let ledger = map.get(&handle).ok_or(EngineError::MissingLedger)?;
    let f = filter.unwrap_or(JsCoordFilter { t_min: None, t_max: None, j: None, k: None });
    let qf = QueryFilter { t_min: f.t_min, t_max: f.t_max, j: f.j, k: f.k };
    let tree = UemTree::build(&ledger.records);
    let res = tree.query(&qf);
    Ok(res.iter().map(to_buffer).collect())
}

#[napi]
pub fn scd_compact_handle(handle: u32) -> Result<bool> {
    let mut map = LEDGERS.lock().map_err(|e| Error::from_reason(e.to_string()))?;
    let ledger = map.get_mut(&handle).ok_or(EngineError::MissingLedger)?;
    let res = scd_compact(&ledger.records);
    if res.compacted {
        ledger.rewrite(res.new_records).map_err(|e| EngineError::Io(e.to_string()))?;
    }
    Ok(res.compacted)
}

#[napi]
pub fn jiwol_encode(coord: JsObject) -> Result<Buffer> {
    let c = to_coord(coord)?;
    let id = encode_coord(&c);
    let mut out = Vec::with_capacity(40);
    for v in id.iter() {
        out.extend_from_slice(&v.to_le_bytes());
    }
    Ok(Buffer::from(out))
}

#[napi]
pub fn jiwol_decode(buf: Buffer) -> Result<JsObject> {
    if buf.len() != 40 {
        return Err(Error::from_reason("invalid JiwolId length".to_string()));
    }
    let mut arr = [0u16; 20];
    for i in 0..20 {
        arr[i] = u16::from_le_bytes([buf[i*2], buf[i*2+1]]);
    }
    let coord = decode_coord(&arr);
    let env = Env::current()?;
    let js_obj = env.create_object()?;
    js_obj.set("t", coord.t)?;
    js_obj.set("x", coord.x)?;
    js_obj.set("a", coord.a)?;
    js_obj.set("w", coord.w)?;
    js_obj.set("j", coord.j)?;
    js_obj.set("k", coord.k)?;
    js_obj.set("p", coord.p)?;
    js_obj.set("m", coord.m)?;
    js_obj.set("c", coord.c)?;
    Ok(js_obj)
}

fn to_coord(obj: JsObject) -> Result<Coord9> {
    let mut c = Coord9::default();
    c.t = obj.get::<u64>("t").unwrap_or(0);
    c.x = obj.get::<u64>("x").unwrap_or(0);
    c.a = obj.get::<u32>("a").unwrap_or(0);
    c.w = obj.get::<u32>("w").unwrap_or(0);
    c.j = obj.get::<u64>("j").unwrap_or(0);
    c.k = obj.get::<u32>("k").unwrap_or(0);
    c.p = obj.get::<u32>("p").unwrap_or(0) as u8;
    c.m = obj.get::<u32>("m").unwrap_or(0) as u8;
    c.c = obj.get::<u32>("c").unwrap_or(0) as u8;
    Ok(c)
}
