import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, RotateCcw, Trash2, Download, ArrowRight } from "lucide-react";

interface DFTResult {
  re: number;
  im: number;
  freq: number;
  amp: number;
  phase: number;
}

interface Epicycle {
  freq: number;
  amp: number;
  phase: number;
}

function dft(x: number[]): DFTResult[] {
  const X: DFTResult[] = [];
  const N = x.length;

  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;

    for (let n = 0; n < N; n++) {
      const val = x[n];
      if (val === undefined) continue;
      const phi = (2 * Math.PI * k * n) / N;
      re += val * Math.cos(phi);
      im -= val * Math.sin(phi);
    }

    re = re / N;
    im = im / N;

    let freq = k;
    let amp = Math.sqrt(re * re + im * im);
    let phase = Math.atan2(im, re);

    X.push({ re, im, freq, amp, phase });
  }

  return X;
}

export default function FourierDrawPage() {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const animCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [showGears, setShowGears] = useState(true);
  const [numEpicycles, setNumEpicycles] = useState(50);
  const animationRef = useRef<number>();

  // 计算傅里叶变换并获取齿轮
  const getEpicycles = useCallback((): { x: Epicycle[]; y: Epicycle[] } | null => {
    if (points.length < 3) return null;

    // 分离 x 和 y 坐标，以画布中心为原点
    const centerX = 400; // drawCanvas width / 2
    const centerY = 300; // drawCanvas height / 2

    const x = points.map(p => p.x - centerX);
    const y = points.map(p => p.y - centerY);

    // DFT
    const fourierX = dft(x);
    const fourierY = dft(y);

    // 按振幅排序（降序）
    const sortedX = [...fourierX].sort((a, b) => b.amp - a.amp);
    const sortedY = [...fourierY].sort((a, b) => b.amp - a.amp);

    // 转换为 Epicycle 格式
    const epicyclesX: Epicycle[] = sortedX.slice(0, numEpicycles).map(f => ({
      freq: f.freq,
      amp: f.amp,
      phase: f.phase,
    }));

    const epicyclesY: Epicycle[] = sortedY.slice(0, numEpicycles).map(f => ({
      freq: f.freq,
      amp: f.amp,
      phase: f.phase,
    }));

    return { x: epicyclesX, y: epicyclesY };
  }, [points, numEpicycles]);

  // 获取绘制画布坐标
  const getDrawCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // 绘制画布渲染
  const renderDrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // 绘制网格
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // 绘制提示文字
    if (points.length === 0) {
      ctx.fillStyle = "#9ca3af";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("在此区域绘制闭合图形", width / 2, height / 2);
      return;
    }

    // 绘制路径
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const firstPoint = points[0];
    if (firstPoint) {
      ctx.moveTo(firstPoint.x, firstPoint.y);
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        if (p) ctx.lineTo(p.x, p.y);
      }
      // 闭合路径
      ctx.lineTo(firstPoint.x, firstPoint.y);
    }
    ctx.stroke();

    // 绘制采样点
    ctx.fillStyle = "#ef4444";
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points]);

  // 动画画布渲染
  const renderAnimCanvas = useCallback((time: number = 0) => {
    const canvas = animCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    // 绘制网格
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    if (points.length < 3) {
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("完成绘制后点击播放", width / 2, height / 2);
      return;
    }

    const epicycles = getEpicycles();
    if (!epicycles) return;

    const centerX = width / 2;
    const centerY = height / 2;

    // 绘制原始路径参考（半透明）
    ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    const firstPoint = points[0];
    if (firstPoint) {
      ctx.moveTo(firstPoint.x, firstPoint.y);
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        if (p) ctx.lineTo(p.x, p.y);
      }
      ctx.lineTo(firstPoint.x, firstPoint.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // X 轴齿轮
    let prevX = centerX;
    let prevY = centerY;

    if (showGears) {
      // 绘制 X 轴齿轮（红色系）
      for (const e of epicycles.x) {
        const radius = e.amp;

        ctx.strokeStyle = `rgba(239, 68, 68, 0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(prevX, prevY, radius, 0, Math.PI * 2);
        ctx.stroke();

        const angle = e.freq * time + e.phase;

        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(prevX + radius * Math.cos(angle), prevY + radius * Math.sin(angle));
        ctx.stroke();

        prevX += radius * Math.cos(angle);
        prevY += radius * Math.sin(angle);
      }
    }

    // Y 轴齿轮
    let prevY2 = centerY;
    let finalX = prevX;
    let finalY = prevY;

    if (showGears) {
      // 绘制 Y 轴齿轮（蓝色系）
      for (const e of epicycles.y) {
        const radius = e.amp;

        ctx.strokeStyle = `rgba(59, 130, 246, 0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(finalX, prevY2, radius, 0, Math.PI * 2);
        ctx.stroke();

        const angle = e.freq * time + e.phase;
        finalX += radius * Math.cos(angle);
        finalY += radius * Math.sin(angle);

        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(finalX - radius * Math.cos(angle), prevY2);
        ctx.lineTo(finalX, prevY2 + radius * Math.sin(angle));
        ctx.stroke();

        prevY2 += radius * Math.sin(angle);
      }
    }

    // 绘制当前点
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(finalX, finalY, 5, 0, Math.PI * 2);
    ctx.fill();

    // 绘制已生成的路径
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let firstEpicycleX = epicycles.x[0];
    if (firstEpicycleX) {
      ctx.moveTo(centerX + firstEpicycleX.amp, centerY);
    }
    for (let t = 0; t <= time; t += 0.01) {
      let px = 0, py = 0;
      for (const e of epicycles.x) {
        px += e.amp * Math.cos(e.freq * t + e.phase);
      }
      for (const e of epicycles.y) {
        py += e.amp * Math.sin(e.freq * t + e.phase);
      }
      ctx.lineTo(centerX + px, centerY + py);
    }
    ctx.stroke();
  }, [points, showGears, numEpicycles, getEpicycles]);

  // 开始绘制
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const coords = getDrawCanvasCoords(e);
    setPoints([{ x: coords.x, y: coords.y }]);
  };

  // 绘制中
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getDrawCanvasCoords(e);
    setPoints(prev => [...prev, { x: coords.x, y: coords.y }]);
  };

  // 停止绘制
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // 清空画布
  const clearCanvas = () => {
    setPoints([]);
    setIsAnimating(false);
    setAnimationTime(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // 动画循环
  const animate = () => {
    setAnimationTime(prev => {
      const newTime = prev + 0.02;
      if (newTime > Math.PI * 2) {
        setIsAnimating(false);
        return prev;
      }
      renderAnimCanvas(newTime);
      animationRef.current = requestAnimationFrame(animate);
      return newTime;
    });
  };

  // 开始动画
  const startAnimation = () => {
    if (points.length < 3) return;
    setIsAnimating(true);
    setAnimationTime(0);
    animate();
  };

  // 暂停动画
  const pauseAnimation = () => {
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // 切换动画
  const toggleAnimation = () => {
    if (isAnimating) {
      pauseAnimation();
    } else {
      startAnimation();
    }
  };

  // 导出齿轮配置
  const exportGears = () => {
    const epicycles = getEpicycles();
    if (!epicycles) return;

    const data = {
      x: epicycles.x.map((e, i) => ({
        gear: i + 1,
        frequency: e.freq,
        amplitude: e.amp.toFixed(2),
        phase: e.phase.toFixed(4),
      })),
      y: epicycles.y.map((e, i) => ({
        gear: i + 1,
        frequency: e.freq,
        amplitude: e.amp.toFixed(2),
        phase: e.phase.toFixed(4),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fourier-gears.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 当 points 改变时重新渲染绘制画布
  useEffect(() => {
    renderDrawCanvas();
  }, [points, renderDrawCanvas]);

  // 当动画时间改变时重新渲染动画画布
  useEffect(() => {
    renderAnimCanvas(animationTime);
  }, [animationTime, showGears, numEpicycles, renderAnimCanvas]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to="/">
            <button className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>返回首页</span>
            </button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            傅里叶齿轮绘制
          </h1>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Drawing Canvas Area */}
        <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800">
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                绘制区域
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {points.length} 个采样点
            </span>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <canvas
              ref={drawCanvasRef}
              width={400}
              height={400}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              用鼠标绘制任意闭合图形
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center p-2">
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </div>

        {/* Animation Canvas Area */}
        <div className="flex-1 flex flex-col">
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                齿轮动画
              </h2>
            </div>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <canvas
              ref={animCanvasRef}
              width={400}
              height={400}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700"
            />
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
            <button
              onClick={() => setShowGears(!showGears)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showGears
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {showGears ? "隐藏齿轮" : "显示齿轮"}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            控制面板
          </h2>

          {/* Instructions */}
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              1. 在左侧绘制闭合图形<br />
              2. 点击播放查看齿轮动画
            </p>
          </div>

          {/* Gear Count Slider */}
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              齿轮数量: {numEpicycles}
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={numEpicycles}
              onChange={(e) => setNumEpicycles(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Stats */}
          <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {points.length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">采样点</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {numEpicycles}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">齿轮数</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={toggleAnimation}
              disabled={points.length < 3}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {isAnimating ? (
                <>
                  <Pause className="h-4 w-4" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  播放动画
                </>
              )}
            </button>

            <button
              onClick={() => {
                clearCanvas();
                setAnimationTime(0);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium"
            >
              <RotateCcw className="h-4 w-4" />
              重置动画
            </button>

            <button
              onClick={clearCanvas}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium"
            >
              <Trash2 className="h-4 w-4" />
              清空重绘
            </button>

            <button
              onClick={exportGears}
              disabled={points.length < 3}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
            >
              <Download className="h-4 w-4" />
              导出配置
            </button>
          </div>

          {/* Gear Info */}
          {points.length >= 3 && (
            <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                齿轮说明
              </h3>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p>• 红色齿轮: 控制 X 坐标</p>
                <p>• 蓝色齿轮: 控制 Y 坐标</p>
                <p>• 圆的大小 = 振幅</p>
                <p>• 旋转速度 = 频率</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
