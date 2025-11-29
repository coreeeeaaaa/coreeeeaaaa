use crate::quantum::UemQuantum;

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
        let mut candidates: Option<HashSet<usize>> = None;

        if let Some(j) = filter.j {
            if let Some(idx) = self.by_project.get(&j) {
                candidates = Some(idx.iter().copied().collect());
            } else {
                return Vec::new();
            }
        }

        if let Some(k) = filter.k {
            let step_set: HashSet<usize> = self
                .by_step
                .get(&k)
                .map(|v| v.iter().copied().collect())
                .unwrap_or_default();
            candidates = match candidates {
                Some(existing) => Some(existing.intersection(&step_set).copied().collect()),
                None => Some(step_set),
            };
        }

        if filter.t_min.is_some() || filter.t_max.is_some() {
            let t_min = filter.t_min.unwrap_or(0);
            let t_max = filter.t_max.unwrap_or(u64::MAX);
            let time_set: HashSet<usize> = self
                .by_time
                .iter()
                .filter_map(|(t, idx)| if *t >= t_min && *t <= t_max { Some(*idx) } else { None })
                .collect();
            candidates = match candidates {
                Some(existing) => Some(existing.intersection(&time_set).copied().collect()),
                None => Some(time_set),
            };
        }

        let final_set: HashSet<usize> = candidates.unwrap_or_else(|| (0..self.records.len()).collect());
        let mut out = Vec::with_capacity(final_set.len());
        for (_, idx) in self.by_time.iter() {
            if final_set.contains(idx) {
                if let Some(q) = self.records.get(*idx) {
                    out.push(q.clone());
                }
            }
        }
        out
    }
}
