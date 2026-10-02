// layout-prefixsum.js — 变尺寸方块的紧凑排布
//
// 问题：每个格子的宽高由外部数据决定（这里叫"基因"），所以列与列的宽度不一样、
//       行与行的高度也不一样。最简单做法是 px = gx * pitch，但那样格子之间
//       会出现缝或重叠 —— 因为 pitch 是常量，而格子不是。
//
// 做法：把"每一列里最宽的格子"和"每一行里最高的格子"各自前缀求和。
//       任意一格的左边永远紧贴前一格的右边，上边永远紧贴上一格的下边。
//       O(N + COLS + ROWS)，无迭代、无松弛，所以零抖动。
//
// 这是为一个具体问题写的：已知的多边形/机器人自组装实现（aTAM、Kilobot 等）
// 都建立在"所有单元一样大"之上，一旦尺寸连续可变，排布就要重写。

/**
 * @param {Array<{gx:number, gy:number, w:number, h:number}>} cells
 *        每个格子的整数格坐标与像素尺寸
 * @param {{cols:number, rows:number}} grid 网格规模
 * @param {{originX?:number, originY?:number, gap?:number}} [opts]
 *        originX/originY 是左上角像素原点（默认从 0 开始）
 *        gap 是格子之间的额外留白（默认 0 = 紧贴）
 * @returns {{x:number, y:number, w:number, h:number}[]} 与输入同序的像素矩形
 */
export function layoutPrefixSum(cells, grid, opts = {}) {
  const { cols, rows } = grid;
  const originX = opts.originX ?? 0;
  const originY = opts.originY ?? 0;
  const gap = opts.gap ?? 0;

  // ① 每列最宽、每行最高。没有格子的列/行贡献 0。
  const colW = new Float64Array(cols);
  const rowH = new Float64Array(rows);
  for (const c of cells) {
    if (c.gx < 0 || c.gx >= cols || c.gy < 0 || c.gy >= rows) continue;
    if (c.w > colW[c.gx]) colW[c.gx] = c.w;
    if (c.h > rowH[c.gy]) rowH[c.gy] = c.h;
  }

  // ② 前缀和 = 该列左边缘 / 该行上边缘的像素坐标
  const colK = new Float64Array(cols);
  const rowK = new Float64Array(rows);
  let accX = originX;
  for (let x = 0; x < cols; x++) { colK[x] = accX; accX += colW[x] + gap; }
  let accY = originY;
  for (let y = 0; y < rows; y++) { rowK[y] = accY; accY += rowH[y] + gap; }

  // ③ 坐标 = 前缀和 + 本格的一半。格子在自己的列/行里居中，
  //    所以窄格子不会贴左边、矮格子不会贴上边。
  return cells.map(c => ({
    x: colK[c.gx] + colW[c.gx] / 2,
    y: rowK[c.gy] + rowH[c.gy] / 2,
    w: c.w,
    h: c.h,
  }));
}

/**
 * 整块内容的像素尺寸 —— 用来居中或做包围盒。
 */
export function layoutExtent(cells, grid, opts = {}) {
  const { cols, rows } = grid;
  const gap = opts.gap ?? 0;
  const colW = new Float64Array(cols);
  const rowH = new Float64Array(rows);
  for (const c of cells) {
    if (c.gx < 0 || c.gx >= cols || c.gy < 0 || c.gy >= rows) continue;
    if (c.w > colW[c.gx]) colW[c.gx] = c.w;
    if (c.h > rowH[c.gy]) rowH[c.gy] = c.h;
  }
  let w = 0, h = 0;
  for (let x = 0; x < cols; x++) w += colW[x] + (x ? gap : 0);
  for (let y = 0; y < rows; y++) h += rowH[y] + (y ? gap : 0);
  return { w, h };
}
