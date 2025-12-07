// TypeScript 샘플 파일
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export function calculateSum(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0);
}

console.log(greet("World"));
console.log(calculateSum([1, 2, 3, 4, 5]));