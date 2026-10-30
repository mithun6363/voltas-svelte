<script>
	/**
	 * LiveChart.svelte
	 * High-Performance 60-Second Real-Time Canvas Scrolling Chart
	 */
	import { onMount, onDestroy } from 'svelte';
	import { TrendingUp } from 'lucide-svelte';

	let { history = [] } = $props();

	/** @type {HTMLCanvasElement} */
	let canvas;
	let animationFrameId;
	let showVoltage = $state(true);
	let showCurrent = $state(true);
	let showPower = $state(true);

	function renderChart() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
			canvas.width = width * dpr;
			canvas.height = height * dpr;
		}

		ctx.save();
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, width, height);

		const padding = { top: 20, right: 45, bottom: 25, left: 45 };
		const chartW = width - padding.left - padding.right;
		const chartH = height - padding.top - padding.bottom;

		if (chartW <= 0 || chartH <= 0) {
			ctx.restore();
			return;
		}

		// Draw subtle horizontal grid lines
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
		ctx.lineWidth = 1;
		for (let i = 0; i <= 4; i++) {
			const y = padding.top + (chartH / 4) * i;
			ctx.beginPath();
			ctx.moveTo(padding.left, y);
			ctx.lineTo(padding.left + chartW, y);
			ctx.stroke();
		}

		// Y-Scale domains:
		// Voltage: 10.0V to 14.0V
		// Current: 0.0A to 5.0A
		// Power: 0.0W to 60.0W
		const vMin = 10.0, vMax = 14.0;
		const cMin = 0.0, cMax = 5.0;
		const pMin = 0.0, pMax = 60.0;

		// Draw Axis Labels
		ctx.font = '10px monospace';
		ctx.fillStyle = '#64748b';

		// Left Axis (Voltage)
		ctx.textAlign = 'right';
		ctx.fillText(`${vMax}V`, padding.left - 8, padding.top + 4);
		ctx.fillText(`${((vMax + vMin) / 2).toFixed(1)}V`, padding.left - 8, padding.top + chartH / 2 + 4);
		ctx.fillText(`${vMin}V`, padding.left - 8, padding.top + chartH);

		// Right Axis (Current / Power)
		ctx.textAlign = 'left';
		ctx.fillText(`${cMax}A`, padding.left + chartW + 8, padding.top + 4);
		ctx.fillText(`${((cMax + cMin) / 2).toFixed(1)}A`, padding.left + chartW + 8, padding.top + chartH / 2 + 4);
		ctx.fillText(`${cMin}A`, padding.left + chartW + 8, padding.top + chartH);

		// Need at least 2 points to draw series
		const points = history.slice(-60);
		if (points.length >= 2) {
			const stepX = chartW / 59; // 60 slots (0..59)
			const startOffset = 59 - (points.length - 1);

			// Helper to draw a line series
			function drawSeries(getValue, min, max, strokeColor, glowColor) {
				ctx.save();
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = 2;
				ctx.shadowColor = glowColor;
				ctx.shadowBlur = 8;
				ctx.beginPath();

				points.forEach((pt, i) => {
					const val = getValue(pt);
					const normalized = (val - min) / (max - min);
					const clamped = Math.max(0, Math.min(1, normalized));
					const x = padding.left + (startOffset + i) * stepX;
					const y = padding.top + chartH * (1 - clamped);

					if (i === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				});

				ctx.stroke();
				ctx.restore();
			}

			// Draw Power Series (Emerald)
			if (showPower) {
				drawSeries(p => p.power, pMin, pMax, '#10b981', 'rgba(16, 185, 129, 0.4)');
			}

			// Draw Current Series (Amber)
			if (showCurrent) {
				drawSeries(p => p.current, cMin, cMax, '#f59e0b', 'rgba(245, 158, 11, 0.4)');
			}

			// Draw Voltage Series (Cyan)
			if (showVoltage) {
				drawSeries(p => p.voltage, vMin, vMax, '#06b6d4', 'rgba(6, 182, 212, 0.4)');
			}
		} else {
			// Placeholder when waiting for points
			ctx.font = '12px sans-serif';
			ctx.fillStyle = '#64748b';
			ctx.textAlign = 'center';
			ctx.fillText('Collecting 60-second real-time telemetry...', width / 2, height / 2);
		}

		ctx.restore();
	}

	function loop() {
		renderChart();
		animationFrameId = requestAnimationFrame(loop);
	}

	onMount(() => {
		animationFrameId = requestAnimationFrame(loop);
	});

	onDestroy(() => {
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
	});
</script>

<div class="glass-card rounded-2xl p-4 sm:p-5">
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
		<div class="flex items-center gap-2">
			<TrendingUp class="h-4 w-4 text-cyan-400" />
			<h3 class="text-sm font-bold tracking-wider text-slate-300 uppercase">Live 60-Second Telemetry Chart</h3>
		</div>

		<!-- Metric Toggle Filter Badges -->
		<div class="flex flex-wrap items-center gap-2">
			<button
				class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all
				{showVoltage ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.25)]' : 'bg-slate-800 text-slate-500 border border-transparent'}"
				onclick={() => (showVoltage = !showVoltage)}
			>
				<span class="h-2 w-2 rounded-full bg-cyan-400"></span>
				<span>Voltage (V)</span>
			</button>

			<button
				class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all
				{showCurrent ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]' : 'bg-slate-800 text-slate-500 border border-transparent'}"
				onclick={() => (showCurrent = !showCurrent)}
			>
				<span class="h-2 w-2 rounded-full bg-amber-400"></span>
				<span>Current (A)</span>
			</button>

			<button
				class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all
				{showPower ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]' : 'bg-slate-800 text-slate-500 border border-transparent'}"
				onclick={() => (showPower = !showPower)}
			>
				<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
				<span>Power (W)</span>
			</button>
		</div>
	</div>

	<!-- Canvas Container -->
	<div class="relative mt-4 h-64 w-full">
		<canvas bind:this={canvas} class="h-full w-full block"></canvas>
	</div>
</div>

