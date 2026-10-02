// placement-score.js — 落位偏好：黏附收益 + 空间收益
//
// 一个自由单元要并入已有结构时，它只能看见自己四个邻居。
// 没有调度器、没有蓝图、没有一个进程知道"整体该长什么样"。
//
// 它算两笔账：
//   黏附收益 = 贴上去之后四邻里同类有几个     → 抱团
//   空间收益 = 那个格子四邻里空着的有几个     → 不挤
//
// 这个偏好的来历是接触抑制（contact inhibition）：
// 正常细胞挨着就停止分裂，一旦旁边空出来了，抑制消失，它就顺势铺过去。
// 细胞不是"知道那里缺了一块"，是它自己旁边空出来了。
//
// ★ 关键性质：两个权重的**比值**是连续难度旋钮，不是开关。
//   偏空间 → 会主动铺进缺口（补得快）
//   偏黏附 → 只肯贴着同类挤（缺口留着）
// 于是"缺口补不补得上"这件事，取决于还有没有个体愿意挪过去。
//
// ★ 也正因为如此：模板模式绝对不能掉进这个评分。
//   一旦模板格挑不出来就 fall through 到这里，它会专挑"旁边空着的格"
//   = 离主体最远的格，形状当场散架。见 docs/pitfalls.md 第 1 条。

export const NEIGHBORS_4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * 给一个候选格打分（分越高越想落）。
 *
 * @param {number} gx
 * @param {number} gy
 * @param {(x:number,y:number)=>boolean} occupied 该格是否已被同类占据
 * @param {{bondGain?:number, spaceGain?:number, cols?:number, rows?:number}} [opts]
 * @returns {number}
 */
export function scoreSlot(gx, gy, occupied, opts = {}) {
  const bondGain = opts.bondGain ?? 1.0;
  const spaceGain = opts.spaceGain ?? 0.15;
  const cols = opts.cols ?? Infinity;
  const rows = opts.rows ?? Infinity;

  let same = 0, free = 0;
  for (const [dx, dy] of NEIGHBORS_4) {
    const x = gx + dx, y = gy + dy;
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue;   // 出界不算空
    if (occupied(x, y)) same++;
    else free++;
  }
  return same * bondGain + free * spaceGain;
}

/**
 * 从候选格里挑一个。
 *
 * @param {[number,number][]} candidates
 * @param {(x:number,y:number)=>boolean} occupied
 * @param {{bondGain?:number, spaceGain?:number, cols?:number, rows?:number,
 *          tieBreak?:(a:[number,number],b:[number,number])=>number}} [opts]
 * @returns {[number,number]|null}
 */
export function pickSlot(candidates, occupied, opts = {}) {
  if (!candidates.length) return null;

  let best = null, bestScore = -Infinity;
  for (const [gx, gy] of candidates) {
    const s = scoreSlot(gx, gy, occupied, opts);
    if (s > bestScore) { bestScore = s; best = [gx, gy]; }
  }
  if (!best) return null;

  // 并列时交给 tieBreak（通常是"离质心最近"）
  if (opts.tieBreak) {
    const tied = candidates.filter(
      c => scoreSlot(c[0], c[1], occupied, opts) === bestScore);
    if (tied.length > 1) {
      tied.sort(opts.tieBreak);
      return tied[0];
    }
  }
  return best;
}

/**
 * 便利函数：从一组已落位的格子出发，生成所有相邻空格。
 */
export function frontier(placed, cols, rows, occupied) {
  const seen = new Set();
  const out = [];
  for (const [px, py] of placed) {
    for (const [dx, dy] of NEIGHBORS_4) {
      const x = px + dx, y = py + dy;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const k = x + ',' + y;
      if (seen.has(k)) continue;
      seen.add(k);
      if (occupied(x, y)) continue;
      out.push([x, y]);
    }
  }
  return out;
}
