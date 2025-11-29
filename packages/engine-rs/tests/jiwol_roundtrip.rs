use coreeeeaaaa_uem_engine::jiwol_id::{encode_coord, decode_coord};
use coreeeeaaaa_uem_engine::coord::Coord9;

#[test]
fn jiwol_roundtrip() {
    let c = Coord9 { t: 123, x: 456, a: 7, w: 8, j: 9, k: 2, p: 1, m: 1, c: 0 };
    let id = encode_coord(&c);
    let decoded = decode_coord(&id);
    assert_eq!(c, decoded);
}
