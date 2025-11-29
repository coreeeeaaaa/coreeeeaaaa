use coreeeeaaaa_uem_engine::*;
use coreeeeaaaa_uem_engine::quantum::UemQuantum;
use coreeeeaaaa_uem_engine::jiwol_id::encode_coord;
use coreeeeaaaa_uem_engine::coord::Coord9;
use coreeeeaaaa_uem_engine::ledger::Ledger;
use coreeeeaaaa_uem_engine::ahs::validate_evolution;
use std::path::PathBuf;
use tempfile::tempdir;

fn sample_quantum(idx: u64) -> UemQuantum {
    let mut q = UemQuantum::default();
    let coord = Coord9 { t: idx, x: 0, a: 1, w: 0, j: 7, k: 2, p: 1, m: 1, c: 0 };
    q.coord = coord;
    q.id = encode_coord(&coord);
    q.payload_hash = hash_bytes(format!("payload-{idx}").as_bytes());
    q.state_snapshot = q.payload_hash;
    q
}

#[test]
fn chain_validates_and_detects_tamper() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("core.uem");
    let mut ledger = Ledger::open(path.clone(), genesis_quantum()).unwrap();
    for i in 0..5 {
        ledger.append(sample_quantum(i)).unwrap();
    }
    assert!(ledger.validate_chain());
    ledger.tamper_at(2, 0xFF).unwrap();
    let ledger2 = Ledger::open(path, genesis_quantum()).unwrap();
    assert!(!ledger2.validate_chain());
}

#[test]
fn query_filters_by_project_and_time() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("core.uem");
    let mut ledger = Ledger::open(path, genesis_quantum()).unwrap();
    for i in 0..10 {
        ledger.append(sample_quantum(i)).unwrap();
    }
    let tree = crate::uem_tree::UemTree::build(&ledger.records);
    let res = tree.query(&crate::uem_tree::QueryFilter { t_min: Some(3), t_max: Some(6), j: Some(7), k: None });
    assert_eq!(res.len(), 4);
}

#[test]
fn scd_compaction_reduces_records() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("core.uem");
    let mut ledger = Ledger::open(path.clone(), genesis_quantum()).unwrap();
    for i in 0..250 {
        ledger.append(sample_quantum(i)).unwrap();
    }
    let before = ledger.records.len();
    let res = crate::scd::scd_compact(&ledger.records);
    assert!(res.compacted);
    ledger.rewrite(res.new_records).unwrap();
    let after = ledger.records.len();
    assert!(after < before);
    let ledger2 = Ledger::open(path, genesis_quantum()).unwrap();
    assert!(ledger2.validate_chain());
}

#[test]
fn ahs_rejects_large_jump() {
    let mut prev = sample_quantum(1);
    prev.thickness.re = 1.0;
    let mut next = sample_quantum(2);
    next.thickness.re = 10.0;
    assert!(!validate_evolution(&prev, &next));
}
