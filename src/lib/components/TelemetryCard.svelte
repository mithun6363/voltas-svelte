<script>
	/**
	 * TelemetryCard.svelte
	 * Glassmorphism Card for Real-time Sensor & Battery Metrics
	 */

	let {
		title = '',
		value = '--',
		unit = '',
		subtext = '',
		icon = null,
		percentage = null,
		color = 'cyan', // 'cyan' | 'green' | 'amber' | 'purple' | 'rose'
		disabled = false
	} = $props();

	const colorClasses = {
		cyan: {
			border: 'hover:border-cyan-500/40',
			iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
			bar: 'bg-gradient-to-r from-cyan-500 to-blue-500',
			glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]'
		},
		green: {
			border: 'hover:border-emerald-500/40',
			iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
			bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
			glow: 'shadow-[0_0_15px_rgba(34,197,94,0.15)]'
		},
		amber: {
			border: 'hover:border-amber-500/40',
			iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
			bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
			glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]'
		},
		purple: {
			border: 'hover:border-purple-500/40',
			iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
			bar: 'bg-gradient-to-r from-purple-500 to-indigo-500',
			glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]'
		},
		rose: {
			border: 'hover:border-rose-500/40',
			iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
			bar: 'bg-gradient-to-r from-rose-500 to-red-400',
			glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]'
		}
	};

	const theme = $derived(colorClasses[color] || colorClasses.cyan);
</script>

<div
	class="glass-card relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-300 {theme.border} {disabled ? 'opacity-40 grayscale pointer-events-none' : ''}"
>
	<!-- Subtle background glow -->
	<div class="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/5 blur-2xl"></div>

	<div class="flex items-center justify-between gap-2">
		<span class="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
		{#if icon}
			<div class="flex h-8 w-8 items-center justify-center rounded-xl border {theme.iconBg}">
				{@render icon()}
			</div>
		{/if}
	</div>

	<!-- Main Digital Display -->
	<div class="mt-3 flex items-baseline gap-1.5">
		<span class="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
			{value}
		</span>
		{#if unit}
			<span class="text-sm font-semibold text-slate-400">{unit}</span>
		{/if}
	</div>

	<!-- Subtext & State indication -->
	{#if subtext}
		<p class="mt-1 text-xs text-slate-400 font-medium">{subtext}</p>
	{/if}

	<!-- Dynamic Mini Gauge / Progress Bar -->
	{#if percentage !== null}
		<div class="mt-3.5">
			<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
				<div
					class="h-full rounded-full transition-all duration-500 {theme.bar}"
					style="width: {Math.max(0, Math.min(100, percentage))}%"
				></div>
			</div>
		</div>
	{/if}
</div>

