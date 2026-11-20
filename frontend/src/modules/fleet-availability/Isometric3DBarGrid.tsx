import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  RotateCcw, Play, Pause, AlertTriangle, Hash, ArrowUpDown, Info,
} from "lucide-react";
import { EnrichedAsset, CALENDAR_WEEKS } from "./FleetAvailabilityDesk";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface Isometric3DBarGridProps {
  assets: EnrichedAsset[];
  selectedAsset: EnrichedAsset;
  onSelectAsset: (asset: EnrichedAsset) => void;
  onReserveAsset?: (asset: EnrichedAsset) => void;
  themeMode?: "dark-energia" | "light-slate"; // ignored – always white
}

interface TooltipState {
  visible: boolean; x: number; y: number;
  assetCode: string; assetModel: string; ratingKva: number;
  jobProject: string; jobClient: string; weekRange: string;
  jobType: string; badge?: string; telemetryNote?: string; hub: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   COLOUR PALETTE — always light / white
───────────────────────────────────────────────────────────────────────────── */
const C = {
  bg:          "#FFFFFF",
  bgGrad1:     "#F8F9FB",
  bgGrad2:     "#EEF0F5",
  gridLine:    "rgba(100,116,139,0.18)",
  floorEven:   "rgba(226,232,240,0.55)",
  floorOdd:    "rgba(241,245,249,0.70)",
  currentWall: "rgba(237,26,83,0.10)",
  currentEdge: "rgba(237,26,83,0.70)",
  axisLine:    "#64748B",
  axisText:    "#1E293B",
  dimText:     "#94A3B8",
  labelBg:     "rgba(255,255,255,0.88)",
  ON_HIRE:      { top:"#ED1A53", front:"#c01040", side:"#8c0d2f", glow:"rgba(237,26,83,0.22)" },
  AVAILABLE:    { top:"#10B981", front:"#0a8a60", side:"#076b4a", glow:"rgba(16,185,129,0.20)" },
  MAINTENANCE:  { top:"#F59E0B", front:"#c47d08", side:"#976006", glow:"rgba(245,158,11,0.20)" },
  CLASH_LOCKED: { top:"#F97316", front:"#c55b10", side:"#97440b", glow:"rgba(249,115,22,0.20)" },
  MOBILISATION: { top:"#94A3B8", front:"#64748B", side:"#475569", glow:"rgba(100,116,139,0.18)" },
};
const jobPal = (t: string) =>
  t === "ON_HIRE" ? C.ON_HIRE : t === "AVAILABLE" ? C.AVAILABLE :
  t === "MAINTENANCE" ? C.MAINTENANCE : t === "CLASH_LOCKED" ? C.CLASH_LOCKED : C.MOBILISATION;

/* ─────────────────────────────────────────────────────────────────────────────
   3-D PROJECTION  (Yaw then Pitch)
───────────────────────────────────────────────────────────────────────────── */
function project(wx:number,wy:number,wz:number, rX:number,rY:number, s:number, cx:number,cy:number) {
  const cosY=Math.cos(rY), sinY=Math.sin(rY);
  const rx = wx*cosY - wy*sinY;
  const ry = wx*sinY + wy*cosY;
  const cosX=Math.cos(rX), sinX=Math.sin(rX);
  const rz  =  wz*cosX - ry*sinX;
  const ry2 =  wz*sinX + ry*cosX;
  return { sx: cx + rx*s, sy: cy - rz*s + ry2*s*0.3 };
}

function lighten(hex:string, a:number) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,Math.round(r+(255-r)*a))},${Math.min(255,Math.round(g+(255-g)*a))},${Math.min(255,Math.round(b+(255-b)*a))})`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export function Isometric3DBarGrid({
  assets, selectedAsset, onSelectAsset,
}: Isometric3DBarGridProps) {
  const canvasRef    = useRef<HTMLCanvasElement|null>(null);
  const containerRef = useRef<HTMLDivElement|null>(null);
  const rafRef       = useRef<number>(0);
  const spinAngle    = useRef<number>(0);

  // Camera
  const [rotX, setRotX] = useState(0.46);
  const [rotY, setRotY] = useState(0.20);
  const [scale, setScale] = useState(1.0);  // zoom multiplier (auto-fit × scale)

  const [spinning, setSpinning]       = useState(true);
  const spinRef = useRef(spinning); spinRef.current = spinning;

  const [showNumbers, setShowNumbers] = useState(false);
  const [sortMode, setSortMode]       = useState<"standard"|"kva"|"status">("standard");
  const [filterMode, setFilterMode]   = useState<"all"|"hire"|"available"|"clash">("all");

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible:false,x:0,y:0,assetCode:"",assetModel:"",ratingKva:0,
    jobProject:"",jobClient:"",weekRange:"",jobType:"",hub:"",
  });

  const dragRef = useRef<{active:boolean;lastX:number;lastY:number}>({active:false,lastX:0,lastY:0});

  /* sorted / filtered assets */
  const displayAssets = (() => {
    let list = [...assets];
    if (filterMode==="hire")      list = list.filter(a=>a.jobs.some((j:{type:string})=>j.type==="ON_HIRE"));
    if (filterMode==="available") list = list.filter(a=>a.jobs.some((j:{type:string})=>j.type==="AVAILABLE"));
    if (filterMode==="clash")     list = list.filter(a=>a.jobs.some((j:{type:string})=>j.type==="CLASH_LOCKED"));
    if (sortMode==="kva")    list.sort((a,b)=>b.ratingKva-a.ratingKva);
    if (sortMode==="status") list.sort((a,b)=>a.status.localeCompare(b.status));
    return list;
  })();

  const NUM_WEEKS = CALENDAR_WEEKS.length;
  const CURRENT_WEEK_IDX = 2; // W11

  /* ─── HIT ZONES ──────────────────────────────────────────────────────── */
  const hitZonesRef = useRef<Array<{
    asset: EnrichedAsset;
    job: EnrichedAsset["jobs"][number];
    polys: Array<{ px: number[]; py: number[] }>;
  }>>([]);

  /* ─── DRAW ───────────────────────────────────────────────────────────── */
  const draw = useCallback(()=>{
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d"); if(!ctx) return;
    const W = canvas.width, H = canvas.height;

    const GX = 1.9, GY = 1.15, MAX_H = 3.4;
    const nG = displayAssets.length;
    const maxKva = Math.max(...assets.map(a=>a.ratingKva), 1);

    // ── Reserved margins for 2D axis labels ───────────────────────────
    const ML = 108; // left  — Y-axis title + week labels
    const MB = 60;  // bottom — X-axis title + generator labels
    const MT = 18;  // top
    const MR = 24;  // right

    // Available 3D viewport
    const VW = W - ML - MR;
    const VH = H - MT - MB;

    /* ── Background ─────────────────────────────────────────────────── */
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    // slight tint inside 3D viewport
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(ML, MT, VW, VH);

    /* ── Auto-fit: scale 3D grid to fill the viewport ──────────────── */
    const rawP = (wx:number,wy:number,wz:number) => project(wx,wy,wz,rotX,rotY,1,0,0);
    const corners:[number,number,number][] = [
      [0,0,0],[nG*GX,0,0],[0,NUM_WEEKS*GY,0],[nG*GX,NUM_WEEKS*GY,0],
      [0,0,MAX_H],[nG*GX,0,MAX_H],[0,NUM_WEEKS*GY,MAX_H],[nG*GX,NUM_WEEKS*GY,MAX_H],
    ];
    let mnX=Infinity,mxX=-Infinity,mnY=Infinity,mxY=-Infinity;
    for(const [bx,by,bz] of corners){
      const p=rawP(bx,by,bz);
      mnX=Math.min(mnX,p.sx); mxX=Math.max(mxX,p.sx);
      mnY=Math.min(mnY,p.sy); mxY=Math.max(mxY,p.sy);
    }
    const innerPad = 12;
    const fitS = Math.min(
      (VW - innerPad*2) / Math.max(mxX-mnX, 1),
      (VH - innerPad*2) / Math.max(mxY-mnY, 1)
    ) * scale;

    // Re-project with final scale to get true centre
    let mnX2=Infinity,mxX2=-Infinity,mnY2=Infinity,mxY2=-Infinity;
    for(const [bx,by,bz] of corners){
      const p=project(bx,by,bz,rotX,rotY,fitS,0,0);
      mnX2=Math.min(mnX2,p.sx); mxX2=Math.max(mxX2,p.sx);
      mnY2=Math.min(mnY2,p.sy); mxY2=Math.max(mxY2,p.sy);
    }
    // Centre of viewport
    const vpCx = ML + VW/2;
    const vpCy = MT + VH/2;
    const cx = vpCx - (mnX2+mxX2)/2;
    const cy = vpCy - (mnY2+mxY2)/2;
    const proj = (wx:number,wy:number,wz:number) => project(wx,wy,wz,rotX,rotY,fitS,cx,cy);

    /* ── Clip to viewport so 3D content doesn't bleed into label area ── */
    ctx.save();
    ctx.beginPath();
    ctx.rect(ML, MT, VW, VH);
    ctx.clip();

    /* ── Floor lane shading ──────────────────────────────────────────── */
    for(let gi=0;gi<nG;gi++){
      const tl=proj(gi*GX,0,0), tr=proj((gi+1)*GX,0,0);
      const br=proj((gi+1)*GX,NUM_WEEKS*GY,0), bl=proj(gi*GX,NUM_WEEKS*GY,0);
      ctx.beginPath();
      ctx.moveTo(tl.sx,tl.sy); ctx.lineTo(tr.sx,tr.sy);
      ctx.lineTo(br.sx,br.sy); ctx.lineTo(bl.sx,bl.sy);
      ctx.closePath();
      ctx.fillStyle = gi%2===0 ? C.floorEven : C.floorOdd;
      ctx.fill();
    }

    /* ── Grid lines ──────────────────────────────────────────────────── */
    ctx.lineWidth=0.7; ctx.strokeStyle=C.gridLine;
    for(let gi=0;gi<=nG;gi++){
      const a=proj(gi*GX,0,0), b=proj(gi*GX,NUM_WEEKS*GY,0);
      ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.stroke();
    }
    for(let wi=0;wi<=NUM_WEEKS;wi++){
      const a=proj(0,wi*GY,0), b=proj(nG*GX,wi*GY,0);
      ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.stroke();
    }

    /* ── Current week laser wall ─────────────────────────────────────── */
    const wallH = MAX_H+0.5;
    const wBL=proj(0,CURRENT_WEEK_IDX*GY,0), wBR=proj(nG*GX,CURRENT_WEEK_IDX*GY,0);
    const wTR=proj(nG*GX,CURRENT_WEEK_IDX*GY,wallH), wTL=proj(0,CURRENT_WEEK_IDX*GY,wallH);
    ctx.save();
    ctx.globalAlpha=0.15; ctx.fillStyle=C.currentWall;
    ctx.beginPath();
    ctx.moveTo(wBL.sx,wBL.sy); ctx.lineTo(wBR.sx,wBR.sy);
    ctx.lineTo(wTR.sx,wTR.sy); ctx.lineTo(wTL.sx,wTL.sy);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha=1;
    ctx.strokeStyle=C.currentEdge; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(wBL.sx,wBL.sy); ctx.lineTo(wBR.sx,wBR.sy); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();

    /* ── Build & sort slabs ──────────────────────────────────────────── */
    type Slab = {
      gi:number; asset:EnrichedAsset; job:EnrichedAsset["jobs"][number];
      y0:number; y1:number; h:number; pal:typeof C.ON_HIRE; depth:number;
    };
    const slabs:Slab[] = [];
    for(let gi=0;gi<nG;gi++){
      const asset=displayAssets[gi];
      const h = MAX_H*(asset.ratingKva/maxKva)*0.85+0.3;
      for(const job of asset.jobs){
        const y0=(job.startWeek-1)*GY;
        const y1=(job.startWeek-1+job.spanWeeks)*GY;
        slabs.push({gi,asset,job,y0,y1,h,pal:jobPal(job.type),depth:(y0+y1)/2+gi*0.001});
      }
    }
    slabs.sort((a,b)=>b.depth-a.depth);

    /* ── Draw slabs ──────────────────────────────────────────────────── */
    const hitZones:typeof hitZonesRef.current = [];
    const PAD_X=0.07, PAD_Y=0.05;

    for(const s of slabs){
      const {gi,asset,job,y0,y1,h,pal}=s;
      const isSel = asset.code===selectedAsset.code;
      const x0=gi*GX+PAD_X, x1=(gi+1)*GX-PAD_X;
      const sy0=y0+PAD_Y, sy1=y1-PAD_Y;
      const B=[proj(x0,sy0,0),proj(x1,sy0,0),proj(x1,sy1,0),proj(x0,sy1,0)];
      const T=[proj(x0,sy0,h),proj(x1,sy0,h),proj(x1,sy1,h),proj(x0,sy1,h)];

      ctx.beginPath(); // Front
      ctx.moveTo(B[0].sx,B[0].sy); ctx.lineTo(B[1].sx,B[1].sy);
      ctx.lineTo(T[1].sx,T[1].sy); ctx.lineTo(T[0].sx,T[0].sy); ctx.closePath();
      ctx.fillStyle=pal.front; ctx.globalAlpha=isSel?1:0.88; ctx.fill();
      ctx.strokeStyle=isSel?"#333":"rgba(0,0,0,0.08)"; ctx.lineWidth=isSel?1.2:0.4; ctx.stroke();

      ctx.beginPath(); // Right
      ctx.moveTo(B[1].sx,B[1].sy); ctx.lineTo(B[2].sx,B[2].sy);
      ctx.lineTo(T[2].sx,T[2].sy); ctx.lineTo(T[1].sx,T[1].sy); ctx.closePath();
      ctx.fillStyle=pal.side; ctx.globalAlpha=isSel?1:0.80; ctx.fill();
      ctx.strokeStyle=isSel?"#333":"rgba(0,0,0,0.05)"; ctx.lineWidth=0.4; ctx.stroke();

      ctx.beginPath(); // Top
      ctx.moveTo(T[0].sx,T[0].sy); ctx.lineTo(T[1].sx,T[1].sy);
      ctx.lineTo(T[2].sx,T[2].sy); ctx.lineTo(T[3].sx,T[3].sy); ctx.closePath();
      const tg=ctx.createLinearGradient(T[0].sx,T[0].sy,T[2].sx,T[2].sy);
      tg.addColorStop(0,lighten(pal.top,0.30)); tg.addColorStop(1,pal.top);
      ctx.fillStyle=tg; ctx.globalAlpha=isSel?1:0.94; ctx.fill();
      ctx.strokeStyle=isSel?"#333":"rgba(0,0,0,0.10)"; ctx.lineWidth=isSel?1.2:0.5; ctx.stroke();
      ctx.globalAlpha=1;

      // Label on top face
      const tcx=(T[0].sx+T[1].sx+T[2].sx+T[3].sx)/4;
      const tcy=(T[0].sy+T[1].sy+T[2].sy+T[3].sy)/4;
      const faceW=Math.abs(T[1].sx-T[0].sx);
      if(faceW>28){
        ctx.font="bold 8px 'Inter',sans-serif";
        ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(job.client.length>12?job.client.slice(0,11)+"…":job.client, tcx,tcy);
        if(showNumbers && faceW>44){
          ctx.font="7px 'Inter',sans-serif";
          ctx.fillText(`${asset.ratingKva}kVA`,tcx,tcy+10);
        }
      }
      ctx.textBaseline="alphabetic";
      hitZones.push({
        asset,
        job,
        polys: [
          { px: T.map(p => p.sx), py: T.map(p => p.sy) },
          { px: [B[0].sx, B[1].sx, T[1].sx, T[0].sx], py: [B[0].sy, B[1].sy, T[1].sy, T[0].sy] },
          { px: [B[1].sx, B[2].sx, T[2].sx, T[1].sx], py: [B[1].sy, B[2].sy, T[2].sy, T[1].sy] },
        ],
      });
    }
    hitZonesRef.current=hitZones;

    /* ── W11 NOW tag (inside viewport, top-right of wall) ───────────── */
    {
      const lp=proj(nG*GX+0.05,CURRENT_WEEK_IDX*GY,wallH*0.4);
      ctx.font="bold 9px 'Inter',sans-serif";
      ctx.textAlign="left"; ctx.textBaseline="middle";
      ctx.fillStyle="#ED1A53";
      ctx.fillText("W11 NOW",lp.sx+2,lp.sy);
    }

    ctx.restore(); // end viewport clip

    /* ═══════════════════════════════════════════════════════════════════
       2D AXIS LABELS — drawn OUTSIDE the 3D viewport in screen space
    ═══════════════════════════════════════════════════════════════════ */

    /* ── Y-AXIS (left side) ─────────────────────────────────────────── */
    // Axis title — rotated, fixed left edge
    ctx.save();
    ctx.translate(16, MT + VH/2);
    ctx.rotate(-Math.PI/2);
    ctx.font = "bold 12px 'Inter',sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#45142B";
    ctx.fillText("Timeline (Weeks) →", 0, 0);
    ctx.restore();

    // Separator line
    ctx.strokeStyle = "#CBD5E1"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ML-1, MT); ctx.lineTo(ML-1, MT+VH); ctx.stroke();

    // Week tick labels — project each week's left edge point to get screen Y,
    // then draw label at that Y, fixed X in the left margin
    for(let wi=0;wi<NUM_WEEKS;wi++){
      const pFront = proj(0, (wi+0.5)*GY, 0); // mid-week, left edge
      const sy = pFront.sy;
      if(sy < MT || sy > MT+VH) continue; // skip if off viewport

      const wk = CALENDAR_WEEKS[wi];
      const isCur = wi===CURRENT_WEEK_IDX;
      const labelX = ML - 6;

      if(isCur){
        ctx.fillStyle = "rgba(237,26,83,0.12)";
        ctx.beginPath();
        ctx.roundRect(labelX-62, sy-10, 62, 20, 4);
        ctx.fill();
        // tick mark
        ctx.strokeStyle = "#ED1A53"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ML-8,sy); ctx.lineTo(ML-1,sy); ctx.stroke();
      } else {
        ctx.strokeStyle = "#CBD5E1"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ML-5,sy); ctx.lineTo(ML-1,sy); ctx.stroke();
      }

      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.font = isCur ? "bold 10px 'Inter',sans-serif" : "9px 'Inter',sans-serif";
      ctx.fillStyle = isCur ? "#ED1A53" : "#475569";
      ctx.fillText(wk?.code ?? `W${wi+9}`, labelX-4, sy);

      ctx.font = "8px 'Inter',sans-serif";
      ctx.fillStyle = "#94A3B8";
      ctx.fillText(wk?.label ?? "", labelX-4, sy+11);
    }

    /* ── X-AXIS (bottom) ────────────────────────────────────────────── */
    // Separator line
    ctx.strokeStyle = "#CBD5E1"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ML, MT+VH+1); ctx.lineTo(ML+VW, MT+VH+1); ctx.stroke();

    // Generator tick labels — project each generator's front-centre to get screen X,
    // then draw label at that X, fixed Y in the bottom margin
    for(let gi=0;gi<nG;gi++){
      const asset = displayAssets[gi];
      const pFront = proj((gi+0.5)*GX, 0, 0); // front centre of this generator
      const sx = pFront.sx;
      if(sx < ML || sx > ML+VW) continue;

      const isSel = asset.code===selectedAsset.code;
      const labelY = MT + VH + 10;

      // tick mark
      ctx.strokeStyle = isSel ? "#ED1A53" : "#CBD5E1"; ctx.lineWidth = isSel?2:1;
      ctx.beginPath(); ctx.moveTo(sx, MT+VH+1); ctx.lineTo(sx, labelY); ctx.stroke();

      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.font = "bold 9px 'Inter',sans-serif";
      ctx.fillStyle = isSel ? "#ED1A53" : "#1E293B";
      ctx.fillText(asset.code, sx, labelY+2);
      ctx.font = "8px 'Inter',sans-serif";
      ctx.fillStyle = "#94A3B8";
      ctx.fillText(`${asset.ratingKva}kVA`, sx, labelY+14);
    }

    // X-axis title — centred below generator labels
    ctx.font = "bold 11px 'Inter',sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillStyle = "#45142B";
    ctx.fillText("Generator Assets (kVA Capacity) →", ML + VW/2, H - 4);

    /* ── Legend (fixed top-right of canvas) ─────────────────────────── */
    const lgItems=[
      {l:"On-Hire Contract",  c:C.ON_HIRE.top},
      {l:"Available / Ready", c:C.AVAILABLE.top},
      {l:"Maintenance",       c:C.MAINTENANCE.top},
      {l:"Clash Locked",      c:C.CLASH_LOCKED.top},
      {l:"Mobilisation",      c:C.MOBILISATION.top},
    ];
    const lgX=W-130, lgY=MT+6;
    ctx.fillStyle="rgba(255,255,255,0.95)";
    ctx.beginPath(); ctx.roundRect(lgX-8,lgY-4,126,lgItems.length*17+8,6); ctx.fill();
    ctx.strokeStyle="rgba(100,116,139,0.18)"; ctx.lineWidth=1; ctx.stroke();
    for(let i=0;i<lgItems.length;i++){
      const {l,c}=lgItems[i];
      ctx.fillStyle=c;
      ctx.beginPath(); ctx.roundRect(lgX,lgY+i*17+3,10,10,2); ctx.fill();
      ctx.font="9px 'Inter',sans-serif"; ctx.textAlign="left"; ctx.textBaseline="middle";
      ctx.fillStyle="#1E293B";
      ctx.fillText(l, lgX+14, lgY+i*17+8);
    }

  },[rotX,rotY,scale,displayAssets,selectedAsset,showNumbers,assets]);

  /* ─── ANIMATION LOOP ─────────────────────────────────────────────────── */
  useEffect(()=>{
    let running=true;
    const loop=()=>{
      if(!running) return;
      if(spinRef.current){
        spinAngle.current+=0.0025;
        setRotY(Math.sin(spinAngle.current)*0.14+0.20);
      }
      draw();
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return ()=>{ running=false; cancelAnimationFrame(rafRef.current); };
  },[draw]);

  /* ─── RESIZE ─────────────────────────────────────────────────────────── */
  useEffect(()=>{
    const resize=()=>{
      const c=containerRef.current, cv=canvasRef.current;
      if(!c||!cv) return;
      cv.width=c.clientWidth; cv.height=c.clientHeight;
    };
    resize();
    window.addEventListener("resize",resize);
    return ()=>window.removeEventListener("resize",resize);
  },[]);

  /* ─── MOUSE ──────────────────────────────────────────────────────────── */
  const handleMouseDown=useCallback((e:React.MouseEvent)=>{
    dragRef.current={active:true,lastX:e.clientX,lastY:e.clientY};
    setSpinning(false);
  },[]);
  const handleMouseMove=useCallback((e:React.MouseEvent)=>{
    if(!dragRef.current.active) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if(rect && canvasRef.current){
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const isOver = hitZonesRef.current.some(hz => hz.polys.some(poly => pip(poly.px, poly.py, mx, my)));
        canvasRef.current.style.cursor = isOver ? "pointer" : "grab";
      }
      return;
    }
    const dx=e.clientX-dragRef.current.lastX, dy=e.clientY-dragRef.current.lastY;
    setRotY(p=>p+dx*0.007);
    setRotX(p=>Math.max(0.05,Math.min(1.5,p-dy*0.007)));
    dragRef.current.lastX=e.clientX; dragRef.current.lastY=e.clientY;
    if(canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  },[]);
  const handleMouseUp=useCallback(()=>{ dragRef.current.active=false; },[]);
  const handleWheel=useCallback((e:React.WheelEvent)=>{
    e.preventDefault();
    setScale(p=>Math.max(0.4,Math.min(3.0,p-e.deltaY*0.0015)));
  },[]);

  function pip(px:number[],py:number[],mx:number,my:number){
    let inside=false;
    for(let i=0,j=px.length-1;i<px.length;j=i++){
      if(((py[i]>my)!==(py[j]>my))&&mx<((px[j]-px[i])*(my-py[i]))/(py[j]-py[i])+px[i]) inside=!inside;
    }
    return inside;
  }

  const handleClick=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    const rect=canvasRef.current!.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    // Search in reverse order so topmost/frontmost blocks are clicked first
    for(let i=hitZonesRef.current.length-1; i>=0; i--){
      const hz = hitZonesRef.current[i];
      const isHit = hz.polys.some(poly => pip(poly.px, poly.py, mx, my));
      if(isHit){
        onSelectAsset(hz.asset);
        const sw=CALENDAR_WEEKS[hz.job.startWeek-1]?.code??`W${hz.job.startWeek+8}`;
        const ew=CALENDAR_WEEKS[Math.min(hz.job.startWeek-1+hz.job.spanWeeks-1,CALENDAR_WEEKS.length-1)]?.code??"W??";
        setTooltip({
          visible:true, x:mx+14, y:my-14,
          assetCode:hz.asset.code, assetModel:hz.asset.model, ratingKva:hz.asset.ratingKva,
          jobProject:hz.job.project, jobClient:hz.job.client, weekRange:`${sw} → ${ew}`,
          jobType:hz.job.type, badge:hz.job.badge, telemetryNote:hz.job.telemetryNote, hub:hz.asset.hub,
        });
        return;
      }
    }
    setTooltip(t=>({...t,visible:false}));
  },[onSelectAsset]);

  const setPreset=(n:"timeline"|"iso"|"top")=>{
    setSpinning(false);
    if(n==="timeline"){ setRotX(0.46); setRotY(0.20); setScale(1.0); }
    if(n==="iso")     { setRotX(0.65); setRotY(0.45); setScale(1.0); }
    if(n==="top")     { setRotX(1.45); setRotY(0);    setScale(1.0); }
  };

  /* ─── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden select-none border border-slate-200">

      {/* Explanation strip */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
        <Info size={12} className="text-[#ED1A53] flex-shrink-0" />
        <span className="text-slate-500">
          <span className="font-semibold text-slate-700">X-axis</span>: Generator assets ordered by unit.&nbsp;
          <span className="font-semibold text-slate-700">Y-axis</span>: 12-week timeline (W09–W20).&nbsp;
          <span className="font-semibold text-slate-700">Block height</span>: kVA power capacity.&nbsp;
          <span className="text-[#ED1A53] font-semibold">Red wall</span> = W11 current week.
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white border-b border-slate-100">
        {/* Filter */}
        <div className="flex gap-1">
          {(["all","hire","available","clash"] as const).map(f=>(
            <button key={f} onClick={()=>setFilterMode(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterMode===f ? "bg-[#ED1A53] text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}>
              {f==="all"?"All":f==="hire"?"On-Hire":f==="available"?"Available":"Clash Guard"}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-slate-200 mx-1"/>
        <button onClick={()=>setShowNumbers(v=>!v)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            showNumbers?"bg-[#ED1A53]/10 text-[#ED1A53]":"text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}>
          <Hash size={11}/> kVA Labels
        </button>
        <button onClick={()=>setSortMode(s=>s==="standard"?"kva":s==="kva"?"status":"standard")}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
          <ArrowUpDown size={11}/>
          {sortMode==="standard"?"Standard":sortMode==="kva"?"By kVA":"By Status"}
        </button>
        <button onClick={()=>{const a=displayAssets.find(a=>a.jobs.some((j:{type:string})=>j.type==="CLASH_LOCKED"));if(a)onSelectAsset(a);}}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-amber-600 hover:bg-amber-50 transition-colors">
          <AlertTriangle size={11}/> Clashes
        </button>
        <div className="flex-1"/>
        {/* Camera presets */}
        {(["timeline","iso","top"] as const).map(p=>(
          <button key={p} onClick={()=>setPreset(p)}
            className="px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors capitalize">
            {p==="timeline"?"Timeline View":p==="iso"?"Iso 30°":"Top View"}
          </button>
        ))}
        <button onClick={()=>{setRotX(0.46);setRotY(0.20);setScale(1.0);}}
          className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Reset camera">
          <RotateCcw size={13}/>
        </button>
        <button onClick={()=>setSpinning(v=>!v)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            spinning?"bg-[#ED1A53] text-white shadow-sm":"text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200"
          }`}>
          {spinning?<Pause size={11}/>:<Play size={11}/>} Auto-Spin
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-white">
        <canvas ref={canvasRef} className="block w-full h-full"
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
          onWheel={handleWheel} onClick={handleClick}/>

        {/* Tooltip */}
        {tooltip.visible && (
          <div className="absolute pointer-events-none z-50 min-w-56 max-w-72 rounded-xl border border-slate-200 shadow-xl bg-white"
            style={{left:Math.min(tooltip.x,(canvasRef.current?.width??600)-240),top:Math.max(tooltip.y-160,8)}}>
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:jobPal(tooltip.jobType).top}}/>
                <span className="text-xs font-bold text-slate-800">{tooltip.assetCode}</span>
                <span className="text-xs text-slate-400">{tooltip.ratingKva} kVA</span>
              </div>
              <div className="text-[11px] text-slate-400">{tooltip.assetModel}</div>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              <div className="text-xs text-slate-800 font-medium leading-snug">{tooltip.jobProject}</div>
              {tooltip.badge&&(
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white"
                  style={{background:jobPal(tooltip.jobType).front}}>{tooltip.badge}</span>
              )}
              <div className="flex items-center gap-1 text-[11px] text-slate-500">⌛ {tooltip.weekRange}</div>
              {tooltip.telemetryNote&&<div className="text-[11px] text-[#ED1A53]/80">📡 {tooltip.telemetryNote}</div>}
              <div className="text-[11px] text-slate-400">Hub: {tooltip.hub}</div>
            </div>
            <div className="px-4 pb-3 text-[10px] text-slate-300">Drag to rotate · Scroll to zoom</div>
          </div>
        )}

        {/* Controls hint */}
        <div className="absolute bottom-3 right-3 pointer-events-none">
          <div className="bg-white/80 rounded-lg px-3 py-1.5 text-[10px] text-slate-400 shadow-sm border border-slate-100">
            🖱 Drag to rotate · Scroll to zoom · Click block to inspect
          </div>
        </div>
      </div>
    </div>
  );
}
