use coreeeeaaaa_uem_engine::hypervisor::CoreHypervisor;
use coreeeeaaaa_uem_engine::quantum::{UemQuantum, Complex32};
use coreeeeaaaa_uem_engine::coord::Coord9;
use tempfile::tempdir;

#[test]
fn hypervisor_collects_quantum() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("core.uem");
    let mut hyper = CoreHypervisor::open(path.clone()).unwrap();
    let mut quantum = UemQuantum::default();
    quantum.coord = Coord9 { t: 42, x: 0, a: 0, w: 0, j: 0, k: 0, p: 2, m: 0, c: 0 };
    quantum.thickness = Complex32 { re: 0.5, im: 0.2 };
    hyper.apply_quantum(quantum).unwrap();
    assert!(hyper.record_count() >= 2);
    let snapshot = hyper.snapshot_state();
    assert!(snapshot.is_some());
    let records = hyper.query(&coreeeeaaaa_uem_engine::uem_tree::QueryFilter { t_min: Some(42), t_max: None, j: None, k: None });
    assert!(records.len() >= 1);
}
