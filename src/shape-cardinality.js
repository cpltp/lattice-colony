// shape-cardinality.js — 形状能装多少个单元
//
// 常规做法是"给定 N 个单元，把它们塞进某个形状"。
// 真正的约束不在"怎么塞"，而在**每种形状能给出哪些格数**：
//
//   line    任何 n 都可以
//   circle  几乎任何 n —— 半径 r 的完整圆给 1,5,13,29,49...，
//           中间的值靠往外补一圈壳凑出来（14、20、21、24、25 都做得到）
//   square  s²（1, 4, 9, 16, 25...），但允许取最近的 s
//   ring    8r-4（4, 12, 20, 28, 36...）★ 卡死在离散值上
//   cross   4a+1（1, 5, 9, 13, 17, 21...）★ 卡死在离散值上
//
// 所以对 ring / cross 来说，"14 个单元拼一个十字"这件事根本不存在 —— 13 或 17，
// 没有中间值。这时候要问的不是"怎么把 14 塞进去"，而是"这个形状现在能容纳多少"。
//
// 这条约束是数学给的，不是设计选择。写代码时如果不显式处理，就会看到
// "明明给了 14 个单元，形状里只有 13 个"或者"形状自己涨到 21 个"。

/** 整数半径 r 的圆盘格数：1 + 4r + 4*Σ⌊√(r²-i²)⌋ */
/**
 * 半径 r 的圆盘格数：逐行数，第 i 行有 2*floor(sqrt(r²-i²)) + 1 个格。
 * r = 0,1,2,3,4,5 → 1, 5, 13, 29, 49, 81
 *
 * ⚠ 注意：这是"完整半径 r"的格数，它**不是**圆的可用格数上限。
 *   圆可以在这个基础上往外补壳，凑出 13 与 29 之间的任意值（14、20、21…）。
 *   真正卡死的是 ringCount（8r-4）和 crossCount（4a+1）。
 */
export function discCount(r) {
  let n = 0;
  for (let i = -r; i <= r; i++) {
    n += 2 * Math.floor(Math.sqrt(r * r - i * i)) + 1;
  }
  return n;
}

/**
 * 半径 r 的空心方框格数。
 * 遍历条件是 max(|x|,|y|) === r，在 (2r+1)² 的方框里数最外一圈。
 * 直接推：第 r 行和 -r 行各 2r+1 个，中间 (2r-1) 行各 2 个（左右边界）
 *   → 2(2r+1) + 2(2r-1) = 8r
 * r = 1,2,3,4,5 → 8, 16, 24, 32, 40
 */
export function ringCount(r) { return r < 1 ? 0 : 8 * r; }

/** 臂长 a 的十字格数：4a+1（a>=0） */
export function crossCount(a) { return 4 * a + 1; }

/** 边长 s 的实心方块：s² */
export function squareCount(s) { return s * s; }

// ---------- 形状目录 ----------
// 每个形状给出：格子坐标（相对中心）、外接半径 lim、以及"最接近 n 的那个尺寸"

const SHAPES = {
  // 直线：任何 n 都可以
  line: {
    cells: (n) => {
      const out = [];
      const h = Math.floor((n - 1) / 2);
      for (let i = 0; i < n; i++) out.push([i - h, 0]);
      return out;
    },
    fit: (n) => n,
  },

  // 实心圆：格数卡在离散值上。
  // 半径 r 给的格数：1, 5, 13, 29, 49, 81...
  // 中间那些值（21、25、37）靠"r 和 r+1 之间"补出来 ——
  // 做法是在 r 外面再收一圈里距离最近的那些格，直到够数。
  circle: {
    cells: (n) => {
      const r = circleFit(n);
      const out = [];
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
          if (x * x + y * y <= r * r) out.push([x, y]);

      // 不够就往外补：从 r+1 的壳层里按"到圆心距离"由近到远取
      if (out.length < n) {
        const shell = [];
        const R = r + 1;
        for (let y = -R; y <= R; y++)
          for (let x = -R; x <= R; x++) {
            const d2 = x * x + y * y;
            if (d2 > r * r && d2 <= R * R) shell.push([x, y, d2]);
          }
        shell.sort((a, b) => a[2] - b[2]);
        for (const [x, y] of shell) {
          if (out.length >= n) break;
          out.push([x, y]);
        }
      }
      return out;
    },
    fit: circleFit,
  },

  // 空心方框
  ring: {
    cells: (n) => {
      const r = ringFit(n);
      const out = [];
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
          if (Math.max(Math.abs(x), Math.abs(y)) === r) out.push([x, y]);
      return out;
    },
    fit: ringFit,
  },

  // 十字
  cross: {
    cells: (n) => {
      const a = crossFit(n);
      const out = [];
      for (let i = -a; i <= a; i++) {
        out.push([i, 0]);
        if (i !== 0) out.push([0, i]);
      }
      return out;
    },
    fit: crossFit,
  },

  // 实心方块
  square: {
    cells: (n) => {
      const s = squareFit(n);
      const h = Math.floor((s - 1) / 2);
      const out = [];
      for (let y = -h; y <= h; y++)
        for (let x = -h; x <= h; x++) out.push([x, y]);
      return out;
    },
    fit: squareFit,
  },
};

/**
 * 通用的"取最近的离散值"。
 *
 * 每种形状能给出的格数是离散的，给定想要的 n，取绝对值最接近的那个。
 * 向下和向上都允许 —— 只向上取会让 14 变成 20 或 24，形状凭空胖一圈。
 *
 * @param {number} n 期望格数
 * @param {(k:number)=>number} count 该尺寸给多少格
 * @param {number} start 最小尺寸（0 或 1）
 * @param {number} limit 尺寸上限，防御死循环
 */
function nearestCount(n, count, start, limit = 4096) {
  let k = start;
  while (count(k) < n && k < limit) k++;
  if (k === start) return k;
  // 与上一个尺寸比谁更接近
  return Math.abs(count(k - 1) - n) <= Math.abs(count(k) - n) ? k - 1 : k;
}

/** 圆的半径：先让外接框装得下，再回退到最紧凑的那档 */
function circleFit(n) {
  let r = 0;
  while (r * r < n) r++;                                  // (2r+1)² 至少要能装下 n
  while (r > 0 && (2 * r - 1) * (2 * r - 1) >= n) r--;    // 回退，别多一圈
  return r;
}
function ringFit(n) { return nearestCount(n, ringCount, 1); }
function crossFit(n) { return nearestCount(n, crossCount, 0); }
function squareFit(n) { return nearestCount(n, squareCount, 1); }

export const shapeNames = Object.keys(SHAPES);

/**
 * 给定形状名与期望数量，返回**实际**的格子布局。
 * 注意返回的 cells.length 很可能不等于 n —— 这就是这个模块存在的意义。
 *
 * @returns {{cells:[number,number][], n:number, requested:number}}
 *          n 是实际格数，requested 是你想要的
 */
export function buildShape(name, requested) {
  const s = SHAPES[name];
  if (!s) throw new Error(`unknown shape: ${name} (have: ${shapeNames.join(', ')})`);
  const cells = s.cells(requested);
  return { cells, n: cells.length, requested };
}

/** 这个形状在 requested 附近实际能给多少格 */
export function actualCount(name, requested) {
  return buildShape(name, requested).n;
}
