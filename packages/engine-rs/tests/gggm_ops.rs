use coreeeeaaaa_uem_engine::gggm::{GggmOps, GggmValue};
use coreeeeaaaa_uem_engine::coord::Coord9;
use coreeeeaaaa_uem_engine::quantum::Complex32;

fn sample_value() -> GggmValue {
    let coord = Coord9 { t: 1, x: 2, a: 3, w: 4, j: 5, k: 6, p: 1, m: 1, c: 0 };
    let thickness = Complex32 { re: 1.2, im: 0.4 };
    GggmValue::new(coord, thickness)
}

#[test]
fn merge_increases_distance() {
    let base = sample_value();
    let merged = base.merge(&base);
    assert!(merged.coord.t > base.coord.t);
    assert!(merged.thickness.re > base.thickness.re);
}

#[test]
fn parallel_is_not_commutative() {
    let left = sample_value();
    let mut right = sample_value();
    right.coord.w = 10;
    let a = left.parallel(&right);
    let b = right.parallel(&left);
    assert!(a.coord.w != b.coord.w || (a.thickness.re - b.thickness.re).abs() > 1e-6);
}
*** End of File