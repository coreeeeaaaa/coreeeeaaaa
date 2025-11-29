use crate::quantum::UemQuantum;
use crate::coord::Coord9;

#[derive(Default)]
pub struct UemTree {
    pub records: Vec<(usize, UemQuantum)>,
}

#[derive(Default)]
pub struct QueryFilter {
    pub t_min: Option<u64>,
    pub t_max: Option<u64>,
    pub j: Option<u64>,
    pub k: Option<u32>,
}

impl UemTree {
    pub fn build(records: &[UemQuantum]) -> Self {
        let mut v = Vec::new();
        for (idx, q) in records.iter().enumerate() {
            v.push((idx, q.clone()));
        }
        Self { records: v }
    }

    pub fn query(&self, filter: &QueryFilter) -> Vec<UemQuantum> {
        self.records
            .iter()
            .filter_map(|(_, q)| {
                if let Some(tmin) = filter.t_min {
                    if q.coord.t < tmin {
                        return None;
                    }
                }
                if let Some(tmax) = filter.t_max {
                    if q.coord.t > tmax {
                        return None;
                    }
                }
                if let Some(j) = filter.j {
                    if q.coord.j != j {
                        return None;
                    }
                }
                if let Some(k) = filter.k {
                    if q.coord.k != k {
                        return None;
                    }
                }
                Some(q.clone())
            })
            .collect()
    }
}
