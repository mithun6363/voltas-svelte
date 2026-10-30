<script>
	/**
	 * Header.svelte
	 * Dashboard Top Navigation & Status Bar
	 */
	import { appState, setConnectivityMode } from '#lib/connection.svelte.js';
	import { Activity, Wifi, Cloud, Sliders, RefreshCw } from 'lucide-svelte';

	let { onOpenSettings } = $props();

	function handleModeChange(mode) {
		setConnectivityMode(mode);
	}
</script>

<header class="glass-panel sticky top-0 z-40 border-b border-slate-800/80 px-4 py-3.5 sm:px-6">
	<div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
		
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
				<p class="text-xs text-slate-400 hidden sm:block">4-Channel Relay & 12V 14Ah Battery Monitor</p>
			</div>
		</div>

		<!-- Status & Connectivity Controls -->
		<div class="flex flex-wrap items-center gap-2.5 sm:gap-3">
			
			<!-- Animated Health Status Badge -->
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

				<!-- Active Transport Tag -->
				{#if appState.status === 'ONLINE'}
					<span class="border-l border-slate-700/80 pl-2 text-[10px] font-mono text-slate-300">
						{appState.activeTransport === 'LOCAL_HTTP' ? 'LOCAL HTTP' : 'CLOUD MQTT'}
					</span>
				{/if}
			</div>

			<!-- Connectivity Mode Pill Selector -->
			<div class="flex items-center rounded-lg bg-slate-950/70 p-1 border border-slate-800 text-xs">
				<button
					class="rounded-md px-2.5 py-1 font-medium transition-all {appState.mode === 'AUTO' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30 font-semibold' : 'text-slate-400 hover:text-white'}"
					onclick={() => handleModeChange('AUTO')}
					title="Auto fallback from Local HTTP to Cloud MQTT"
				>
					Auto
				</button>
				<button
					class="flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-all {appState.mode === 'LOCAL_HTTP' ? 'bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30 font-semibold' : 'text-slate-400 hover:text-white'}"
					onclick={() => handleModeChange('LOCAL_HTTP')}
					title="Local Direct HTTP Mode (voltas.local)"
				>
					<Wifi class="h-3 w-3" />
					<span class="hidden md:inline">Local</span>
				</button>
				<button
					class="flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-all {appState.mode === 'CLOUD_MQTT' ? 'bg-purple-500/20 text-purple-300 shadow-sm border border-purple-500/30 font-semibold' : 'text-slate-400 hover:text-white'}"
					onclick={() => handleModeChange('CLOUD_MQTT')}
					title="Cloud Remote MQTT Mode (EMQX WebSockets)"
				>
					<Cloud class="h-3 w-3" />
					<span class="hidden md:inline">Cloud</span>
				</button>
			</div>

			<!-- Settings Modal Button -->
			<button
				class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/60 text-slate-300 transition-all hover:border-cyan-500/50 hover:bg-slate-700/80 hover:text-cyan-400"
				onclick={onOpenSettings}
				title="System Configuration (NVS Flash)"
			>
				<Sliders class="h-4 w-4" />
			</button>
		</div>

	</div>
</header>

