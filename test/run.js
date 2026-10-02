// 自测：node test/run.js
// 不依赖任何测试框架，纯 assert。

import assert from 'node:assert/strict';
import { layoutPrefixSum, layoutExtent } from '../src/layout-prefixsum.js';
import {
  discCount, ringCount, crossCount, squareCount,
  buildShape, actualCount, shapeNames,
} from '../src/shape-cardinality.js';
import {
  scoreSlot, pickSlot, frontier, NEIGHBORS_4,
} from '../src/placement-score.js';

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}

console.log('\nlayout-prefixsum');

t('等大格子退化成规则网格', () => {
  const cells = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++)
    cells.push({ gx: x, gy: y, w: 10, h: 10 });
  const out = layoutPrefixSum(cells, { cols: 3, rows: 3 });
  // 中心分别是 5,15,25
  assert.equal(out[0].x, 5); assert.equal(out[1].x, 15); assert.equal(out[8].x, 25);
  assert.equal(out[0].y, 5); assert.equal(out[8].y, 25);
});

t('同一列里窄格子被居中，左右不留缝', () => {
  // 第 0 列有一个宽 20 的，第 1 列有一个宽 10 的
  const cells = [
    { gx: 0, gy: 0, w: 20, h: 10 },
    { gx: 1, gy: 0, w: 10, h: 10 },
  ];
  const out = layoutPrefixSum(cells, { cols: 2, rows: 1 });
  // 第 1 列的左边缘 = 20，中心 = 20 + 10/2 = 25
  assert.equal(out[1].x, 25);
  // 两个格子的右边缘和左边缘之差 = 0（紧贴）
  const right0 = out[0].x + 20 / 2;
  const left1 = out[1].x - 10 / 2;
  assert.equal(left1 - right0, 0);
});

t('同一行里矮格子被居中，上下不留缝', () => {
  const cells = [
    { gx: 0, gy: 0, w: 10, h: 30 },
    { gx: 0, gy: 1, w: 10, h: 10 },
  ];
  const out = layoutPrefixSum(cells, { cols: 1, rows: 2 });
  const bottom0 = out[0].y + 30 / 2;
  const top1 = out[1].y - 10 / 2;
  assert.equal(top1 - bottom0, 0);
});

t('空列/空行不产生间隙（宽度贡献 0）', () => {
  const cells = [{ gx: 0, gy: 0, w: 10, h: 10 }];
  const out = layoutPrefixSum(cells, { cols: 5, rows: 1 });
  assert.equal(out[0].x, 5);   // 后面 4 列没格子，不影响
});

t('列宽由该列最宽者决定，不是逐格累加', () => {
  // 第 0 列同时有宽 10 和宽 30 的格子
  const cells = [
    { gx: 0, gy: 0, w: 10, h: 10 },
    { gx: 0, gy: 1, w: 30, h: 10 },
    { gx: 1, gy: 0, w: 10, h: 10 },
  ];
  const out = layoutPrefixSum(cells, { cols: 2, rows: 2 });
  // 第 1 列左边缘 = 30（取该列最宽），中心 = 35
  assert.equal(out[2].x, 35);
});

t('gap 均匀插入', () => {
  const cells = [
    { gx: 0, gy: 0, w: 10, h: 10 },
    { gx: 1, gy: 0, w: 10, h: 10 },
  ];
  const out = layoutPrefixSum(cells, { cols: 2, rows: 1 }, { gap: 4 });
  assert.equal(out[0].x, 5);
  assert.equal(out[1].x, 10 + 4 + 5);   // 19
});

t('layoutExtent 等于最右/最下的边缘', () => {
  const cells = [
    { gx: 0, gy: 0, w: 10, h: 10 },
    { gx: 1, gy: 0, w: 20, h: 10 },
  ];
  const e = layoutExtent(cells, { cols: 2, rows: 1 });
  assert.equal(e.w, 30);
  assert.equal(e.h, 10);
});

t('格子顺序不影响结果（与输入同序返回）', () => {
  const a = [{ gx: 0, gy: 0, w: 10, h: 10 }, { gx: 1, gy: 0, w: 20, h: 10 }];
  const b = [{ gx: 1, gy: 0, w: 20, h: 10 }, { gx: 0, gy: 0, w: 10, h: 10 }];
  const ra = layoutPrefixSum(a, { cols: 2, rows: 1 });
  const rb = layoutPrefixSum(b, { cols: 2, rows: 1 });
  assert.deepEqual(ra[0], rb[1]);
  assert.deepEqual(ra[1], rb[0]);
});

console.log('\nshape-cardinality');

t('圆盘格数是高斯圆问题序列', () => {
  // 落在整数半径圆内的格数 —— 1, 5, 13, 29, 49, 81, 113, 149, 197, 253
  // （OEIS A000328）
  assert.equal(discCount(0), 1);
  assert.equal(discCount(1), 5);
  assert.equal(discCount(2), 13);
  assert.equal(discCount(3), 29);
  assert.equal(discCount(4), 49);
});

t('空心方是 8r', () => {
  assert.equal(ringCount(1), 8);
  assert.equal(ringCount(2), 16);
  assert.equal(ringCount(3), 24);
  assert.equal(ringCount(4), 32);
});

t('十字是 4a+1', () => {
  for (let a = 0; a < 6; a++) {
    assert.equal(crossCount(a) % 4, 1);
  }
  assert.equal(crossCount(3), 13);
});

t('方块是 s²', () => {
  assert.equal(squareCount(3), 9);
  assert.equal(squareCount(4), 16);
});

t('圆能补出中间值 —— 它不受离散格数限制', () => {
  // 完整的半径 r 只给 1,5,13,29,49，但往外补壳之后 14/20/21/24/25 都能做出来
  for (const n of [1, 5, 9, 13, 14, 20, 21, 24, 25, 29]) {
    assert.equal(actualCount('circle', n), n, `圆应该能精确给出 ${n}`);
  }
});

t('★ 十字与空心方卡死在离散值上 —— 这才是真约束', () => {
  // 十字 4a+1：1,5,9,13,17,21 —— 14 不存在，只能给 13 或 17
  const c14 = actualCount('cross', 14);
  assert.ok(c14 === 13 || c14 === 17, `十字给不出 14，实际 ${c14}`);
  assert.equal(actualCount('cross', 13), 13);
  assert.equal(actualCount('cross', 17), 17);

  // 空心方 8r：8,16,24,32 —— 14 不存在，只能落在离散值上
  const RING = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8].map(r => 8 * r));
  for (const n of [13, 14, 15, 20]) {
    const got = actualCount('ring', n);
    assert.ok(RING.has(got), `空心方给出的 ${got} 不在 8r 序列上`);
  }
});

t('buildShape 返回的 cells 长度 = 实际格数，且可能 != requested', () => {
  for (const name of shapeNames) {
    for (const want of [5, 9, 13, 14, 20, 24, 40]) {
      const r = buildShape(name, want);
      assert.equal(r.cells.length, r.n);
      assert.equal(r.requested, want);
      if (name !== 'line') {
        assert.notEqual(r.n, 0);
      }
    }
  }
});

t('直线的格数永远等于请求数', () => {
  for (const n of [1, 2, 7, 14, 33]) {
    assert.equal(actualCount('line', n), n);
  }
});

t('形状的格子无重复', () => {
  for (const name of shapeNames) {
    const { cells } = buildShape(name, 14);
    const s = new Set(cells.map(c => c.join(',')));
    assert.equal(s.size, cells.length, `${name} 有重复格`);
  }
});

t('形状连通（四邻域）', () => {
  for (const name of shapeNames) {
    const { cells } = buildShape(name, 14);
    if (cells.length <= 1) continue;
    const set = new Set(cells.map(c => c.join(',')));
    const stack = [cells[0]];
    const seen = new Set([cells[0].join(',')]);
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const [dx, dy] of NEIGHBORS_4) {
        const k = (x + dx) + ',' + (y + dy);
        if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + dx, y + dy]); }
      }
    }
    assert.equal(seen.size, cells.length, `${name} 不连通`);
  }
});

t('未知形状名报错', () => {
  assert.throws(() => buildShape('nope', 5), /unknown shape/);
});

console.log('\nplacement-score');

t('纯黏附：优先贴在同类最多的位置', () => {
  // 已有 L 形：三个格子
  const occ = new Set(['0,0', '1,0', '0,1']);
  const occupied = (x, y) => occ.has(x + ',' + y);
  const cands = [[1, 1], [2, 0], [0, 2]];
  // (1,1) 与 (1,0) 和 (0,1) 相邻 → 2 个同类
  // (2,0) 与 (1,0) 相邻 → 1 个
  // (0,2) 与 (0,1) 相邻 → 1 个
  const best = pickSlot(cands, occupied, { spaceGain: 0 });
  assert.deepEqual(best, [1, 1]);
});

t('空间收益 = 0 时退回纯抱团', () => {
  const occ = new Set(['0,0']);
  const occupied = (x, y) => occ.has(x + ',' + y);
  const a = scoreSlot(1, 0, occupied, { spaceGain: 0 });
  const b = scoreSlot(1, 0, occupied, { spaceGain: 0.15 });
  assert.equal(a, 1);            // 只有 1 个同类
  assert.equal(b, 1 + 2 * 0.15); // 1 同类 + 2 个空邻（另两个方向出界会被 cols/rows 挡）
});

t('权重比值改变选择 —— 这就是难度旋钮', () => {
  const occ = new Set(['0,0', '1,0', '0,1']);
  const occupied = (x, y) => occ.has(x + ',' + y);
  const cands = [[1, 1], [3, 0]];
  const cols = 5, rows = 5;
  // [1,1]：2 个同类（(1,0)、(0,1)）+ 2 个空邻（(2,1)、(1,2)）
  //        → 2*bond + 2*space
  // [3,0]：0 个同类 + 3 个空邻（(2,0)、(4,0)、(3,1)；(3,-1) 出界）
  //        → 0*bond + 3*space
  // 等价于两个权重相除：bond/space > 1.5 选前者，< 1.5 选后者。
  const bondWins = pickSlot(cands, occupied, { bondGain: 1, spaceGain: 1.4, cols, rows });
  assert.deepEqual(bondWins, [1, 1],
    'bond/space = 0.71 < 1.5 → 抱团占优');
  assert.deepEqual(
    pickSlot(cands, occupied, { bondGain: 1, spaceGain: 2.5, cols, rows }),
    [3, 0],
    'bond/space = 0.40 < 1.5 → 空间反超');

  // 临界点就在 spaceGain = 1.5
  assert.deepEqual(
    pickSlot(cands, occupied, { bondGain: 1, spaceGain: 1.5, cols, rows }),
    [1, 1],
    '恰好相等时先到者胜（平局保持第一个最高分）');
});

t('出界的邻居不算空位', () => {
  const occupied = () => false;
  const corner = scoreSlot(0, 0, occupied, { spaceGain: 1, cols: 3, rows: 3 });
  const middle = scoreSlot(1, 1, occupied, { spaceGain: 1, cols: 3, rows: 3 });
  assert.equal(corner, 2);   // 角上只有 2 个邻居在界内
  assert.equal(middle, 4);
});

t('空候选返回 null', () => {
  assert.equal(pickSlot([], () => false), null);
});

t('tieBreak 生效', () => {
  const occupied = () => false;
  // 两个候选同分，tieBreak 选更靠原点的
  const r = pickSlot([[5, 5], [1, 1]], occupied, {
    spaceGain: 0, cols: 10, rows: 10,
    tieBreak: (a, b) => (a[0] + a[1]) - (b[0] + b[1]),
  });
  assert.deepEqual(r, [1, 1]);
});

t('frontier 生成所有相邻空格，不重复、不含已占', () => {
  const occ = new Set(['0,0', '1,0']);
  const f = frontier([[0, 0], [1, 0]], 5, 5, (x, y) => occ.has(x + ',' + y));
  const keys = new Set(f.map(c => c.join(',')));
  assert.equal(keys.size, f.length, '有重复');
  assert.ok(!keys.has('0,0'));
  assert.ok(!keys.has('1,0'));
  // (0,0) 的空邻：(0,1)、(-1,0)出界；(1,0) 的空邻：(1,1)、(2,0)
  assert.ok(keys.has('0,1'));
  assert.ok(keys.has('1,1'));
  assert.ok(keys.has('2,0'));
});

t('★ 模板绝不能被这个评分接管（回归测试）', () => {
  // 演示这个陷阱：一个远离主体、旁边空荡荡的格子
  // 在空间收益下会比紧贴主体的格子得分更高
  const occ = new Set(['0,0', '1,0', '0,1']);
  const occupied = (x, y) => occ.has(x + ',' + y);
  const tight = scoreSlot(1, 1, occupied, { bondGain: 1, spaceGain: 1.5, cols: 9, rows: 9 });
  const loose = scoreSlot(5, 5, occupied, { bondGain: 1, spaceGain: 1.5, cols: 9, rows: 9 });
  assert.ok(loose > tight,
    '空间收益占优时，远处的空格得分确实更高 —— ' +
    '所以模板模式一旦 fall through 到这里，形状必然散架');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
