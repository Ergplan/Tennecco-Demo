/**
 * An industrial heat pump, drawn to be read: a piston-compressor skid of the kind that
 * makes 90–165 °C water from waste heat. Benchmarked on real units — a V-block piston
 * compressor with its cylinder heads, the motor coupled behind a guard, the evaporator and
 * condenser as shell-and-tube vessels on saddles, an oil separator and a control cabinet.
 *
 * What moves is what happens:
 *   - the compressor's pistons run in their bores, driven by the crank through connecting
 *     rods — visible through cutaways in the barrels and the crankcase
 *   - refrigerant flows round the loop, coloured by its state: cold vapour, hot gas, warm
 *     liquid, cold two-phase mix after the valve
 *   - it boils in the evaporator (bubbles) and condenses in the condenser (droplets)
 *   - the water circuits flow in and out: chiller water cooled, CIP water heated
 *
 * The figure carries data-part on each component, so the page can bring one stage of the
 * cycle forward while the reader is on it (data-step on the root, set by HeatPumpStory).
 * Motion is SMIL for the mechanism (exact crank kinematics, sampled per frame) and CSS for
 * flow; both stop under prefers-reduced-motion.
 */
import { projector, path, type V3 } from "@/lib/heatpump/proj";

const S = 1.85;
const G = projector(S, 330, 196);
const { P, Pv, box, cyl, window: win, dir, add, mul } = G;

const N = 24;               // frames per crank revolution
const REV = "0.55s";        // one revolution: working hard
const RC = 0.2, ROD = 0.62; // crank throw, rod length
const CRANK_Y = 3.0, CRANK_Z = 0.95;
const ALPHA = (22 * Math.PI) / 180;
const BANK_A: V3 = [0, -Math.sin(ALPHA), Math.cos(ALPHA)];
const BANK_B: V3 = [0, Math.sin(ALPHA), Math.cos(ALPHA)];
const CYLS = [
  { id: "a1", x: 3.9, a: BANK_A, alpha: -ALPHA, phase: 0 },
  { id: "a2", x: 5.3, a: BANK_A, alpha: -ALPHA, phase: Math.PI },
  { id: "b1", x: 4.3, a: BANK_B, alpha: ALPHA, phase: 0 },
  { id: "b2", x: 5.7, a: BANK_B, alpha: ALPHA, phase: Math.PI },
];

const HEAD_T = 1.45;
const HOT_Z = 2.95;           // the hot-gas line's run over the vessels          // where the bore ends and the head begins, along the bank axis
const headTop = (c: (typeof CYLS)[number]): V3 => add([c.x, CRANK_Y, CRANK_Z], mul(c.a, HEAD_T + 0.27));
const f1 = (n: number) => n.toFixed(1);
const frames = Array.from({ length: N + 1 }, (_, k) => (2 * Math.PI * k) / N);
const keyTimes = frames.map((_, k) => (k / N).toFixed(4)).join(";");
const pinAt = (x: number, phi: number): V3 => [x, CRANK_Y + RC * Math.sin(phi), CRANK_Z + RC * Math.cos(phi)];
const strokeAt = (phi: number, alpha: number) => {
  const th = phi - alpha;
  return RC * Math.cos(th) + Math.sqrt(ROD * ROD - RC * RC * Math.sin(th) ** 2);
};

/** SMIL: animate one attribute through per-frame values */
const Anim = ({ attr, values }: { attr: string; values: (string | number)[] }) => (
  <animate attributeName={attr} dur={REV} repeatCount="indefinite" calcMode="linear" keyTimes={keyTimes} values={values.join(";")} />
);

/** a vessel on the skid: body, near end, flanges */
function Vessel({ c, len, r, cls }: { c: V3; len: number; r: number; cls: string }) {
  const v = cyl(c, [1, 0, 0], r, len);
  const fl0 = cyl(add(c, [-0.04, 0, 0]), [1, 0, 0], r * 1.08, 0.1);
  const fl1 = cyl(add(c, [len - 0.06, 0, 0]), [1, 0, 0], r * 1.08, 0.1);
  return (
    <g className={`hpm-vessel ${cls}`}>
      <path className="body" d={fl0.body} />
      <path className="body" d={v.body} />
      <path className="hl" d={path([Pv(add(c, [0.2, 0.15, r * 0.82])), Pv(add(c, [len - 0.2, 0.15, r * 0.82]))], false)} />
      <path className="body" d={fl1.body} /><path className="cap" d={fl1.cap} />
    </g>
  );
}

/** a pipe through 3D points, with the refrigerant (or water) flowing inside it */
function Pipe({ pts, cls, w = 7, part, rev = false }: { pts: V3[]; cls: string; w?: number; part?: string; rev?: boolean }) {
  const d = path(pts.map((p) => Pv(p)), false);
  return (
    <g className={`hpm-pipe ${cls}`} data-part={part}>
      <path className="wall" d={d} style={{ strokeWidth: w }} />
      <path className={`flow${rev ? " rev" : ""}`} d={d} style={{ strokeWidth: Math.max(2, w - 4.5) }} />
    </g>
  );
}

/** a label chip with a leader to the point it describes */
function Tag({ at, dx, dy, text, cls = "", n }: { at: V3; dx: number; dy: number; text: string; cls?: string; n?: number }) {
  const [x, y] = Pv(at);
  const tx = x + dx, ty = y + dy;
  const w = text.length * 6.1 + (n ? 30 : 14);
  const left = Math.min(Math.max(dx < 0 ? tx - w : tx, 6), 1040 - w - 6);
  return (
    <g className={`hpm-tag ${cls}`}>
      <path className="lead" d={`M${f1(x)},${f1(y)}L${f1(tx)},${f1(ty)}`} />
      <circle className="dot" cx={x} cy={y} r={2.6} />
      <rect x={left} y={ty - 11} width={w} height={22} rx={11} />
      {n ? <><circle className="num" cx={left + 12} cy={ty} r={8} /><text className="numt" x={left + 12} y={ty + 3.5}>{n}</text></> : null}
      <text x={left + (n ? 26 : 8)} y={ty + 4}>{text}</text>
    </g>
  );
}

function Barrel({ c }: { c: (typeof CYLS)[number] }) {
  const C: V3 = [c.x, CRANK_Y, CRANK_Z];
  const t0 = 0.42, t1 = HEAD_T;
  const barrel = cyl(add(C, mul(c.a, t0)), c.a, 0.26, t1 - t0);
  const head = cyl(add(C, mul(c.a, t1)), c.a, 0.33, 0.2);
  const plate = cyl(add(C, mul(c.a, t1 + 0.2)), c.a, 0.27, 0.05);
  const slot = win(C, c.a, 0.26, 0.5, HEAD_T - 0.08, 0.95);
  const p0 = strokeAt(c.phase, c.alpha);
  const piston = cyl(add(C, mul(c.a, p0 - 0.12)), c.a, 0.22, 0.3);
  const da = dir(c.a);
  const moves = frames.map((t) => {
    const dp = strokeAt(t + c.phase, c.alpha) - p0;
    return `${f1(da[0] * dp)},${f1(da[1] * dp)}`;
  });
  const pins = frames.map((t) => Pv(add(C, mul(c.a, strokeAt(t + c.phase, c.alpha)))));
  const cranks = frames.map((t) => Pv(pinAt(c.x, t + c.phase)));
  const clip = `hpm-slot-${c.id}`;
  return (
    <g className="hpm-barrel">
      <path className="body" d={barrel.body} />
      {[0.62, 0.8, 0.98].map((t) => <path key={t} className="fin" d={cyl(add(C, mul(c.a, t)), c.a, 0.29, 0.04).body} />)}
      <clipPath id={clip}><path d={slot} /></clipPath>
      <path className="bore" d={slot} />
      <g clipPath={`url(#${clip})`}>
        <line className="rod" x1={f1(cranks[0][0])} y1={f1(cranks[0][1])} x2={f1(pins[0][0])} y2={f1(pins[0][1])}>
          <Anim attr="x1" values={cranks.map((p) => f1(p[0]))} /><Anim attr="y1" values={cranks.map((p) => f1(p[1]))} />
          <Anim attr="x2" values={pins.map((p) => f1(p[0]))} /><Anim attr="y2" values={pins.map((p) => f1(p[1]))} />
        </line>
        <g className="piston">
          <animateTransform attributeName="transform" type="translate" dur={REV} repeatCount="indefinite" calcMode="linear" keyTimes={keyTimes} values={moves.join(";")} />
          <path className="skirt" d={piston.body} /><path className="crown" d={piston.cap} />
        </g>
      </g>
      <path className="rim" d={slot} />
      <path className="head" d={head.body} /><path className="head-cap" d={head.cap} />
      <path className="plate" d={plate.body} />
    </g>
  );
}

export type MachineLabels = {
  sourceName: string
  sourceInC: number
  sourceOutC: number
  sinkName: string
  sinkInC: number
  sinkOutC: number
  cop: number
}

export function HeatPumpMachine({ step = 0, labels }: { step?: number; labels: MachineLabels }) {
  const L = labels;
  const hotGas = Math.round(L.sinkOutC + 20);
  const evapT = Math.round(L.sourceOutC - 5);
  const liqC = Math.round(L.sinkInC + 10);
  // ---- crankcase and its window
  const cc = box(3.4, 2.5, 0.3, 2.8, 1.0, 1.0);
  const ccWin = path([P(3.7, 3.5, 0.55), P(5.9, 3.5, 0.55), P(5.9, 3.5, 1.18), P(3.7, 3.5, 1.18)]);
  const throws = [4.1, 5.5];
  // ---- motor
  const motor = cyl([6.6, 3.0, 1.05], [1, 0, 0], 0.68, 2.8);
  const cowl = cyl([9.4, 3.0, 1.05], [1, 0, 0], 0.72, 0.36);
  const fanC: V3 = [9.76, 3.0, 1.05];
  const spokes = [0, 1, 2].map((k) => frames.map((t) => {
    const a = t * 0.5 + (k * 2 * Math.PI) / 3; // the motor turns slower than a frame suggests
    const e = Pv([fanC[0], fanC[1] + 0.55 * Math.cos(a), fanC[2] + 0.55 * Math.sin(a)]);
    return e;
  }));
  const fc = Pv(fanC);
  const finLines = [-0.9, -0.45, 0, 0.45, 0.9].map((k) => {
    const y = 3.0 + 0.66 * Math.sin(k + 0.6), z = 1.05 + 0.66 * Math.cos(k + 0.6);
    return path([P(6.75, y, z), P(9.3, y, z)], false);
  });
  // ---- vessels' cutaways
  const evapC: V3 = [0.5, 1.0, 1.25], condC: V3 = [6.0, 1.0, 1.35];
  const evapWin = win(evapC, [1, 0, 0], 0.7, 1.0, 3.0, 1.15);
  const condWin = win(condC, [1, 0, 0], 0.75, 0.9, 2.7, 1.15);
  const tubes = (c: V3, r: number, t0: number, t1: number) =>
    [[-0.32, 0.25], [0, 0.32], [0.32, 0.25], [-0.36, -0.05], [0, 0], [0.36, -0.05], [-0.25, -0.33], [0.1, -0.36], [0.4, -0.3]].map(([dy, dz]) =>
      path([P(c[0] + t0, c[1] + dy * r, c[2] + dz * r), P(c[0] + t1, c[1] + dy * r, c[2] + dz * r)], false));
  const liquid = (c: V3, r: number, t0: number, t1: number, level: number) =>
    path([P(c[0] + t0, c[1] - r, c[2] + level), P(c[0] + t1, c[1] - r, c[2] + level), P(c[0] + t1, c[1] + r * 1.4, c[2] + level), P(c[0] + t1, c[1] + r * 1.4, c[2] - 2), P(c[0] + t0, c[1] + r * 1.4, c[2] - 2), P(c[0] + t0, c[1] + r * 1.4, c[2] + level)]);
  const bubbles = Array.from({ length: 14 }, (_, k) => {
    const [x, y] = P(1.2 + (k % 7) * 0.28, 1.0 + ((k * 37) % 10) / 10 - 0.3, 1.05 + ((k * 13) % 5) / 25);
    return <circle key={k} className="bub" cx={f1(x)} cy={f1(y)} r={1.6 + (k % 3) * 0.6} style={{ animationDelay: `${(k * 0.17) % 1.2}s` }} />;
  });
  const drops = Array.from({ length: 12 }, (_, k) => {
    const [x, y] = P(6.95 + (k % 6) * 0.3, 1.0 + ((k * 29) % 10) / 12 - 0.35, 1.7 - ((k * 7) % 4) / 10);
    return <circle key={k} className="drop" cx={f1(x)} cy={f1(y)} r={1.7} style={{ animationDelay: `${(k * 0.21) % 1.3}s` }} />;
  });
  const sight = Pv([7.6, 2.0, 0.5]);
  // ---- cabinet front face (y = 4.2) and its instruments
  const cab = box(0.3, 3.0, 0.3, 1.25, 1.2, 2.3);
  const face = (x: number, z: number) => Pv([x, 4.2, z]);
  const dial = (x: number, z: number, cls: string, sweep: [number, number]) => {
    const [cx, cy] = face(x, z);
    return (
      <g className={`gauge ${cls}`} transform={`translate(${f1(cx)},${f1(cy)}) skewY(26.57)`}>
        <circle r="10" />
        <line x1="0" y1="0" x2="0" y2="-7.5">
          <animateTransform attributeName="transform" type="rotate" dur="0.9s" repeatCount="indefinite" values={`${sweep[0]};${sweep[1]};${sweep[0] + 3};${sweep[1] - 2};${sweep[0]}`} />
        </line>
      </g>
    );
  };
  const [scrX, scrY] = face(0.95, 1.95);

  return (
    <svg className="hpm" viewBox="0 0 1040 650" data-step={step} role="img"
      aria-label={`An industrial piston heat pump. ${L.sourceName} at ${L.sourceInC} °C enters the evaporator; the compressor raises the refrigerant to about ${hotGas} °C; the condenser heats ${L.sinkName} from ${L.sinkInC} to ${L.sinkOutC} °C; the expansion valve returns it cold to the evaporator.`}>
      <defs>
        <radialGradient id="hpm-glow"><stop offset="0" stopColor="var(--heat)" stopOpacity=".35" /><stop offset="1" stopColor="var(--heat)" stopOpacity="0" /></radialGradient>
      </defs>

      {/* ground shadow and skid */}
      <path className="hpm-shadow" d={path([P(-0.3, -0.3), P(11.4, -0.3), P(11.4, 4.8), P(-0.3, 4.8)])} />
      {(() => { const k = box(0, 0, 0, 11, 4.4, 0.3); return <g className="hpm-skid"><path className="t" d={k.top} /><path className="l" d={k.left} /><path className="r" d={k.right} /></g>; })()}
      {[0.6, 1.9, 3.2].map((y) => <path key={y} className="hpm-rail" d={path([P(0.1, y, 0.31), P(10.9, y, 0.31)], false)} />)}

      {/* chiller water in and out of the evaporator — the heat source */}
      <g data-part="evap">
        <Pipe pts={[[-1.4, 0.75, 1.65], [0.5, 0.75, 1.65]]} cls="w-cool" w={9} />
        <Pipe pts={[[0.5, 1.3, 0.85], [-1.4, 1.3, 0.85]]} cls="w-cold" w={9} />
      </g>

      {/* evaporator */}
      <g data-part="evap" className="hpm-part">
        {[1.0, 3.6].map((x) => { const k = box(x, 0.45, 0.3, 0.35, 1.1, 0.35); return <g key={x} className="hpm-saddle"><path className="t" d={k.top} /><path className="l" d={k.left} /><path className="r" d={k.right} /></g>; })}
        <Vessel c={evapC} len={4.0} r={0.7} cls="evap" />
        <clipPath id="hpm-evap-win"><path d={evapWin} /></clipPath>
        <path className="hpm-inside cold" d={evapWin} />
        <g clipPath="url(#hpm-evap-win)">
          <path className="ref-liquid cold" d={liquid(evapC, 0.7, 1.0, 3.0, 0.05)} />
          {tubes(evapC, 0.7, 1.0, 3.0).map((d, k) => <path key={k} className="tube cool" d={d} />)}
          {bubbles}
        </g>
        <path className="hpm-win-rim" d={evapWin} />
      </g>

      {/* condenser */}
      <g data-part="cond" className="hpm-part">
        {[6.5, 9.6].map((x) => { const k = box(x, 0.4, 0.3, 0.35, 1.2, 0.3); return <g key={x} className="hpm-saddle"><path className="t" d={k.top} /><path className="l" d={k.left} /><path className="r" d={k.right} /></g>; })}
        <ellipse className="hpm-heat" cx={Pv(condC)[0] + 120} cy={Pv(condC)[1]} rx="170" ry="70" fill="url(#hpm-glow)" />
        <Vessel c={condC} len={4.5} r={0.75} cls="cond" />
        <clipPath id="hpm-cond-win"><path d={condWin} /></clipPath>
        <path className="hpm-inside hot" d={condWin} />
        <g clipPath="url(#hpm-cond-win)">
          {tubes(condC, 0.75, 0.9, 2.7).map((d, k) => <path key={k} className="tube hot" d={d} />)}
          {drops}
          <path className="ref-liquid warm" d={liquid(condC, 0.75, 0.9, 2.7, -0.5)} />
        </g>
        <path className="hpm-win-rim" d={condWin} />
      </g>

      {/* CIP water through the condenser — the job */}
      <g data-part="cond">
        <Pipe pts={[[12.4, 0.75, 1.0], [10.5, 0.75, 1.0]]} cls="w-warm" w={9} />
        <Pipe pts={[[10.5, 1.3, 1.75], [12.4, 1.3, 1.75]]} cls="w-hot" w={9} />
      </g>

      {/* liquid line, sight glass, expansion valve, cold mix back to the evaporator */}
      <Pipe part="cond" pts={[[9.9, 1.0, 0.6], [9.9, 1.0, 0.5], [9.9, 2.0, 0.5], [5.5, 2.0, 0.5]]} cls="r-liquid" />
      <g data-part="cond" className="hpm-sight">
        <ellipse cx={sight[0]} cy={sight[1]} rx="7" ry="7" />
        {[0, 1, 2].map((k) => <circle key={k} className="sb" cx={sight[0] - 3 + k * 3} cy={sight[1] + 1} r="1.2" style={{ animationDelay: `${k * 0.3}s` }} />)}
      </g>
      <Pipe part="valve" pts={[[5.1, 2.0, 0.5], [4.3, 2.0, 0.5], [4.3, 1.0, 0.5], [4.3, 1.0, 0.6]]} cls="r-mix" />
      <g data-part="valve" className="hpm-part hpm-valve">
        {(() => { const k = box(5.05, 1.85, 0.36, 0.5, 0.3, 0.28); return <><path className="t" d={k.top} /><path className="l" d={k.left} /><path className="r" d={k.right} /></>; })()}
        <path className="act" d={cyl([5.3, 2.0, 0.64], [0, 0, 1], 0.12, 0.42).body} />
        <path className="act-cap" d={cyl([5.3, 2.0, 0.64], [0, 0, 1], 0.12, 0.42).cap} />
      </g>

      {/* suction: cold vapour from the evaporator into the compressor */}
      <Pipe part="evap" pts={[[4.5, 1.0, 1.25], [4.75, 1.0, 1.25], [4.75, 1.0, 1.0], [4.75, 2.5, 1.0]]} cls="r-vapour" w={9} />

      {/* oil separator */}
      <g data-part="comp" className="hpm-part">
        <path className="hpm-sep" d={cyl([2.4, 2.9, 0.3], [0, 0, 1], 0.32, 1.75).body} />
        <path className="hpm-sep-cap" d={cyl([2.4, 2.9, 0.3], [0, 0, 1], 0.32, 1.75).cap} />
      </g>

      {/* the compressor */}
      <g data-part="comp" className="hpm-part hpm-comp">
        <g className="shake">
          <g className="hpm-crank"><path className="t" d={cc.top} /><path className="l" d={cc.left} /><path className="r" d={cc.right} /></g>
          <clipPath id="hpm-cc-win"><path d={ccWin} /></clipPath>
          <path className="bore cc" d={ccWin} />
          <g clipPath="url(#hpm-cc-win)">
            {throws.map((x) => <path key={x} className="web" d={cyl([x - 0.06, CRANK_Y, CRANK_Z], [1, 0, 0], 0.3, 0.12).body} />)}
            {CYLS.map((c) => {
              const cranks = frames.map((t) => Pv(pinAt(c.x, t + c.phase)));
              const pins = frames.map((t) => Pv(add([c.x, CRANK_Y, CRANK_Z], mul(c.a, strokeAt(t + c.phase, c.alpha)))));
              return (
                <g key={c.id}>
                  <line className="rod" x1={f1(cranks[0][0])} y1={f1(cranks[0][1])} x2={f1(pins[0][0])} y2={f1(pins[0][1])}>
                    <Anim attr="x1" values={cranks.map((p) => f1(p[0]))} /><Anim attr="y1" values={cranks.map((p) => f1(p[1]))} />
                    <Anim attr="x2" values={pins.map((p) => f1(p[0]))} /><Anim attr="y2" values={pins.map((p) => f1(p[1]))} />
                  </line>
                  <circle className="pin" r="3.2" cx={f1(cranks[0][0])} cy={f1(cranks[0][1])}>
                    <Anim attr="cx" values={cranks.map((p) => f1(p[0]))} /><Anim attr="cy" values={cranks.map((p) => f1(p[1]))} />
                  </circle>
                </g>
              );
            })}
          </g>
          <path className="hpm-win-rim" d={ccWin} />
          {CYLS.filter((c) => c.a === BANK_A).map((c) => <Barrel key={c.id} c={c} />)}
          {CYLS.filter((c) => c.a === BANK_B).map((c) => <Barrel key={c.id} c={c} />)}
        </g>
      </g>

      {/* discharge: hot gas from the heads, through the oil separator, to the condenser */}
      {(() => {
        const A = CYLS.filter((c) => c.a === BANK_A).map(headTop), B = CYLS.filter((c) => c.a === BANK_B).map(headTop);
        const zM = A[0][2] + 0.14;
        const yA = A[0][1], yB = B[0][1];
        const xA = Math.max(...A.map((t) => t[0])), xB = Math.max(...B.map((t) => t[0]));
        return (
          <>
            {[...A, ...B].map((t, k) => <Pipe key={k} part="comp" pts={[t, [t[0], t[1], zM]]} cls="r-hot" w={6} />)}
            <Pipe part="comp" pts={[[xA, yA, zM], [2.4, yA, zM], [2.4, 2.9, zM]]} cls="r-hot" />
            <Pipe part="comp" pts={[[xB, yB, zM], [2.4, yB, zM], [2.4, 2.9, zM], [2.4, 2.9, 2.05]]} cls="r-hot" />
            <Pipe part="comp" pts={[[2.4, 2.9, zM], [2.4, 2.9, HOT_Z], [2.4, 1.0, HOT_Z], [6.7, 1.0, HOT_Z], [6.7, 1.0, 2.1]]} cls="r-hot" w={9} />
          </>
        );
      })()}

      {/* coupling guard and motor */}
      <g data-part="comp" className="hpm-part">
        {(() => { const k = box(6.2, 2.72, 0.55, 0.42, 0.56, 0.85); return <g className="hpm-guard"><path className="t" d={k.top} /><path className="l" d={k.left} /><path className="r" d={k.right} /></g>; })()}
        {[6.9, 8.8].map((x) => { const k = box(x, 2.45, 0.3, 0.35, 1.1, 0.14); return <g key={x} className="hpm-saddle"><path className="t" d={k.top} /><path className="l" d={k.left} /><path className="r" d={k.right} /></g>; })}
        <g className="hpm-motor">
          <path className="body" d={motor.body} />
          {finLines.map((d, k) => <path key={k} className="fin" d={d} />)}
          <path className="body" d={cowl.body} />
          <path className="cap" d={cowl.cap} />
          {spokes.map((sp, k) => (
            <line key={k} className="spoke" x1={f1(fc[0])} y1={f1(fc[1])} x2={f1(sp[0][0])} y2={f1(sp[0][1])}>
              <Anim attr="x2" values={sp.map((p) => f1(p[0]))} /><Anim attr="y2" values={sp.map((p) => f1(p[1]))} />
            </line>
          ))}
          {(() => { const k = box(7.6, 2.75, 1.68, 0.6, 0.5, 0.32); return <g className="tbox"><path className="t" d={k.top} /><path className="l" d={k.left} /><path className="r" d={k.right} /></g>; })()}
        </g>
      </g>

      {/* control cabinet */}
      <g className="hpm-cab">
        <path className="t" d={cab.top} /><path className="l" d={cab.left} /><path className="r" d={cab.right} />
        <g transform={`translate(${f1(scrX)},${f1(scrY)}) skewY(26.57)`} className="screen">
          <rect x="-20" y="-11" width="40" height="22" rx="2" />
          <text x="0" y="-1">COP {L.cop.toFixed(1)}</text>
          <text x="0" y="8" className="sm">{L.sinkOutC} °C</text>
        </g>
        {dial(0.62, 1.25, "lo", [-60, -40])}
        {dial(1.25, 1.25, "hi", [30, 52])}
      </g>

      {/* labels */}
      <g className="hpm-tags">
        <Tag n={1} at={[2.0, 0.55, 1.85]} dx={60} dy={-112} text={`Evaporator · refrigerant boils, taking heat from ${L.sourceName.toLowerCase()}`} cls="t-evap" />
        <Tag n={2} at={[4.7, 2.1, 2.6]} dx={90} dy={-150} text="Compressor · pistons squeeze the vapour" cls="t-comp" />
        <Tag n={3} at={[8.6, 1.0, 2.1]} dx={40} dy={-120} text={`Condenser · hot gas condenses, heating ${L.sinkName.toLowerCase()}`} cls="t-cond" />
        <Tag n={4} at={[5.3, 2.0, 1.0]} dx={-60} dy={150} text="Expansion valve · pressure drops, it turns cold" cls="t-valve" />
        <Tag at={[-1.0, 0.75, 1.65]} dx={-12} dy={-40} text={`${L.sourceName} ${L.sourceInC} °C in`} cls="minor w" />
        <Tag at={[-1.2, 1.3, 0.85]} dx={-16} dy={-8} text={`returns at ${L.sourceOutC} °C`} cls="minor w" />
        <Tag at={[12.0, 0.75, 1.0]} dx={14} dy={-62} text={`${L.sinkName} ${L.sinkInC} °C in`} cls="minor w" />
        <Tag at={[12.0, 1.3, 1.75]} dx={14} dy={44} text={`to bath ${L.sinkOutC} °C`} cls="minor hot" />
        <Tag at={[4.0, 1.0, HOT_Z]} dx={-20} dy={-46} text={`hot gas ≈ ${hotGas} °C · high pressure`} cls="minor r-hot" />
        <Tag at={[4.75, 1.8, 1.0]} dx={70} dy={84} text={`cold vapour ≈ ${evapT} °C · low pressure`} cls="minor r-vapour" />
        <Tag at={[8.6, 2.0, 0.5]} dx={30} dy={64} text={`warm liquid ≈ ${liqC} °C`} cls="minor r-liquid" />
        <Tag at={[4.3, 1.5, 0.5]} dx={-40} dy={92} text={`cold mix ≈ ${evapT} °C`} cls="minor r-mix" />
      </g>
    </svg>
  );
}
