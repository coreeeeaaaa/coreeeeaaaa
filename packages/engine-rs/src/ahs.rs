use crate::quantum::UemQuantum;

const ALPHA: f32 = 0.8;

fn dist(prev: &UemQuantum, next: &UemQuantum) -> f32 {
    let re_diff = (next.thickness.re - prev.thickness.re).abs();
    let im_diff = (next.thickness.im - prev.thickness.im).abs();
    let t_diff = ((next.coord.t as i128 - prev.coord.t as i128).abs() as f32).ln_1p();
    re_diff + im_diff + t_diff
}

pub fn validate_evolution(prev: &UemQuantum, next: &UemQuantum) -> bool {
    let prev_mag = prev.thickness.re.abs() + prev.thickness.im.abs() + 1.0;
    let d = dist(prev, next);
    d <= ALPHA * prev_mag
}
