use crate::coord::Coord9;
use crate::quantum::Complex32;

#[derive(Clone, Debug)]
pub struct GggmValue {
    pub coord: Coord9,
    pub thickness: Complex32,
}

impl GggmValue {
    pub fn new(coord: Coord9, thickness: Complex32) -> Self {
        Self { coord, thickness }
    }
}

pub trait GggmOps {
    fn merge(&self, other: &Self) -> Self;
    fn parallel(&self, other: &Self) -> Self;
    fn project(&self, layer: u8) -> Self;
    fn measure_tau(&self) -> Complex32;
}

impl GggmOps for GggmValue {
    fn merge(&self, other: &Self) -> Self {
        let mut coord = self.coord;
        coord.t = self.coord.t.max(other.coord.t) + 1;
        coord.x = self.coord.x.max(other.coord.x);
        coord.j = self.coord.j.max(other.coord.j);
        coord.k = self.coord.k.wrapping_add(other.coord.k).saturating_add(1);
        coord.m = coord.m.saturating_add(1);
        let thickness = Complex32 {
            re: self.thickness.re + other.thickness.re + 0.1,
            im: self.thickness.im + other.thickness.im + 0.05,
        };
        Self { coord, thickness }
    }

    fn parallel(&self, other: &Self) -> Self {
        let mut coord = self.coord;
        coord.w = self.coord.w ^ other.coord.w;
        coord.p = (self.coord.p.wrapping_add(other.coord.p)).wrapping_add(1);
        coord.m = (self.coord.m / 2).saturating_add(1);
        coord.k = self.coord.k.wrapping_mul(other.coord.k + 1) + 1;
        let thickness = Complex32 {
            re: (self.thickness.re * 0.6) + (other.thickness.re * 0.8) + 0.05,
            im: (self.thickness.im * 0.4) + (other.thickness.im * 0.9) + 0.08,
        };
        Self { coord, thickness }
    }

    fn project(&self, layer: u8) -> Self {
        let mut coord = self.coord;
        coord.p = layer;
        coord.c = coord.c.saturating_add(1);
        let thickness = Complex32 {
            re: self.thickness.re * 0.75 + (layer as f32 * 0.01),
            im: (self.thickness.im + 0.1).max(0.1),
        };
        Self { coord, thickness }
    }

    fn measure_tau(&self) -> Complex32 {
        self.thickness
    }
}
