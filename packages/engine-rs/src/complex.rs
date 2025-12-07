#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Complex32 {
    pub re: f32,
    pub im: f32,
}

impl Complex32 {
    pub fn mag(&self) -> f32 {
        self.re.abs() + self.im.abs()
    }
}
