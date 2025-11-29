use crate::quantum::UemQuantum;
use crate::coord::Coord9;

use std::collections::{HashMap, HashSet};

#[derive(Default)]
pub struct UemTree {
    by_time: Vec<(u64, usize)>, // (t, index in records)
    by_project: HashMap<u64, Vec<usize>>,
    by_step: HashMap<u32, Vec<usize>>,
    records: Vec<UemQuantum>,
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
        let mut by_time: Vec<(u64, usize)> = records
            .iter()
            .enumerate()
            .map(|(i, q)| (q.coord.t, i))
            .collect();
        by_time.sort_unstable_by_key(|(t, _)| *t);
        let mut by_project: HashMap<u64, Vec<usize>> = HashMap::new();
        let mut by_step: HashMap<u32, Vec<usize>> = HashMap::new();
        for (idx, q) in records.iter().enumerate() {
            by_project.entry(q.coord.j).or_default().push(idx);
            by_step.entry(q.coord.k).or_default().push(idx);
        }
        Self {
            by_time,
            by_project,
            by_step,
            records: records.to_vec(),
        }
    }

    pub fn query(&self, filter: &QueryFilter) -> Vec<UemQuantum> {
        let mut candidate_indices: Vec<usize> = (0..self.records.len()).collect();
        if let Some(j) = filter.j {
            if let Some(idx) = self.by_project.get(&j) {
                candidate_indices = idx.clone();
            } else {
                candidate_indices.clear();
            }
        }
        if let Some(k) = filter.k {
            let mut filtered = Vec::new();
            if let Some(idx) = self.by_step.get(&k) {
                let set: std::collections::HashSet<_> = candidate_indices.iter().copied().collect();
                for i in idx {
                    if set.contains(i) {
                        filtered.push(*i);
                    }
                }
                candidate_indices = filtered;
            } else {
                candidate_indices.clear();
            }
        }
        if let Some(tmin) = filter.t_min {
            candidate_indices.retain(|i| self.records.get(*i).map(|q| q.coord.t >= tmin).unwrap_or(false));
        }
        if let Some(tmax) = filter.t_max {
            candidate_indices.retain(|i| self.records.get(*i).map(|q| q.coord.t <= tmax).unwrap_or(false));
        }
        candidate_indices
            .iter()
            .filter_map(|i| self.records.get(*i).cloned())
            .collect()
    }
}
