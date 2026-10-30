<script>
	/**
	 * Header.svelte
	 * Dashboard Top Navigation & Status Bar
	 */
	import { appState } from '#lib/connection.svelte.js';
	import { Activity } from 'lucide-svelte';
</script>

<header class="glass-panel sticky top-0 z-40 border-b border-slate-800/80 px-4 py-3.5 sm:px-6">
	<div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
		
		<!-- Brand & Logo -->
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-lg shadow-cyan-500/20">
				<Activity class="h-5 w-5 text-slate-950 font-bold" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-base font-bold tracking-tight text-white sm:text-lg">VOLTAS IoT</h1>
					<span class="rounded bg-cyan-950/80 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-800/50">ESP32</span>
				</div>
				<p class="text-xs text-slate-400 hidden sm:block">4-Channel Relay & 12V 14Ah Power Dashboard</p>
			</div>
		</div>

		<!-- Status Badge -->
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md transition-colors
				{appState.status === 'ONLINE'
					? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
					: appState.status === 'CONNECTING'
						? 'border-amber-500/30 bg-amber-950/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
						: 'border-rose-500/30 bg-rose-950/40 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]'}"
			>
				<span class="relative flex h-2 w-2">
					{#if appState.status === 'ONLINE'}
						<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
					{/if}
					<span class="relative inline-flex h-2 w-2 rounded-full
						{appState.status === 'ONLINE' ? 'bg-emerald-500' : appState.status === 'CONNECTING' ? 'bg-amber-500' : 'bg-rose-500'}">
					</span>
				</span>
				<span>{appState.status}</span>
				{#if appState.lastSeen && appState.status === 'ONLINE'}
					<span class="border-l border-slate-700/80 pl-2 text-[10px] text-slate-400 hidden sm:inline">
						{appState.lastSeen}
					</span>
				{/if}
			</div>
		</div>

	</div>
</header>
