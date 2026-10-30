<script>
	/**
	 * +page.svelte  ─  Core ESP32 IoT Control Dashboard
	 */
	import { onMount, onDestroy } from "svelte";
	import {
		appState,
		initConnection,
		destroyConnection,
		setHighCurrentLimit
	} from "#lib/connection.svelte.js";
	import Header from "#lib/components/Header.svelte";
	import TelemetryCard from "#lib/components/TelemetryCard.svelte";
	import RelayGrid from "#lib/components/RelayGrid.svelte";

	import { Zap, Gauge, Clock, Cpu, Thermometer, ShieldAlert, AlertTriangle } from "lucide-svelte";

	onMount(() => {
		initConnection();
	});

	onDestroy(() => {
		destroyConnection();
	});

	let customLimit = $state("3.5");

	const isOnline = $derived(appState.status === "ONLINE");
	const isOvercurrent = $derived(
		isOnline &&
		!isNaN(parseFloat(appState.current)) &&
		parseFloat(appState.current) > 0 &&
		parseFloat(appState.current) >= appState.currentLimit
	);

	// Sync local custom input when appState.currentLimit updates
	$effect(() => {
		customLimit = appState.currentLimit.toString();
	});

	function handleSetLimit(val) {
		const parsed = parseFloat(val);
		if (!isNaN(parsed) && parsed > 0) {
			setHighCurrentLimit(parsed);
		}
	}
</script>

<svelte:head>
	<title>Voltas IoT | ESP32 Relay & Power Control</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-[#07090e] text-slate-100">
	<!-- Top Bar -->
	<Header />

	<!-- Core Dashboard Content -->
	<main class="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
		<!-- Overcurrent Alarm Banner -->
		{#if isOvercurrent}
			<div class="flex items-center gap-3 rounded-2xl border border-rose-500/50 bg-rose-950/40 p-4 text-rose-300 shadow-[0_0_25px_rgba(239,68,68,0.25)] animate-pulse">
				<AlertTriangle class="h-5 w-5 text-rose-400 shrink-0" />
				<div class="flex-1 text-xs sm:text-sm">
					<span class="font-bold text-white">OVERCURRENT ALERT:</span>
					Total load current ({appState.current} A) has reached or exceeded threshold limit ({appState.currentLimit} A). Safety shutdown active.
				</div>
			</div>
		{/if}

		<!-- ── Live Telemetry Cards ───────────────────────────────────────────── -->
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h2
					class="text-xs font-bold tracking-wider text-slate-400 uppercase"
				>
					Live Telemetry
				</h2>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
				<!-- Voltage -->
				<TelemetryCard
					title="Voltage"
					value={isOnline ? appState.voltage : "--"}
					unit="V"
					subtext={isOnline ? "Active Sensor" : "Offline"}
					percentage={isOnline
						? ((parseFloat(appState.voltage) - 10.0) / 3.0) * 100
						: 0}
					color="cyan"
					disabled={!isOnline}
				>
					{#snippet icon()}
						<Gauge class="h-4 w-4" />
					{/snippet}
				</TelemetryCard>

				<!-- Current -->
				<TelemetryCard
					title="Total Current"
					value={isOnline ? appState.current : "--"}
					unit="A"
					subtext={isOnline ? `Limit: ${appState.currentLimit} A` : "Offline"}
					percentage={isOnline
						? Math.min(100, (parseFloat(appState.current) / (appState.currentLimit || 4.0)) * 100)
						: 0}
					color={isOvercurrent ? "rose" : "amber"}
					disabled={!isOnline}
				>
					{#snippet icon()}
						<Zap class="h-4 w-4" />
					{/snippet}
				</TelemetryCard>

				<!-- Power -->
				<TelemetryCard
					title="Power Draw"
					value={isOnline ? appState.power : "--"}
					unit="W"
					subtext={isOnline ? "P = V × I" : "Offline"}
					percentage={isOnline
						? (parseFloat(appState.power) / 50.0) * 100
						: 0}
					color="green"
					disabled={!isOnline}
				>
					{#snippet icon()}
						<Cpu class="h-4 w-4" />
					{/snippet}
				</TelemetryCard>

				<!-- Temperature -->
				<TelemetryCard
					title="Temperature"
					value={isOnline ? appState.temperature : "--"}
					unit="°C"
					subtext={isOnline ? "Sensor Temp" : "Offline"}
					percentage={isOnline
						? Math.min(100, Math.max(0, (parseFloat(appState.temperature) / 80.0) * 100))
						: 0}
					color="rose"
					disabled={!isOnline}
				>
					{#snippet icon()}
						<Thermometer class="h-4 w-4" />
					{/snippet}
				</TelemetryCard>

				<!-- Estimated Runtime -->
				<TelemetryCard
					title="Est. Runtime"
					value={isOnline ? appState.runtime : "--"}
					unit=""
					subtext="12V · 14Ah Battery"
					percentage={null}
					color="purple"
					disabled={!isOnline}
				>
					{#snippet icon()}
						<Clock class="h-4 w-4" />
					{/snippet}
				</TelemetryCard>
			</div>
		</section>

		<!-- ── High Current Protection Threshold (NVS) ─────────────────────── -->
		<section class="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-md space-y-3">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<ShieldAlert class="h-4 w-4 text-amber-400" />
						<h3 class="text-xs font-bold tracking-wider text-slate-300 uppercase">
							Overcurrent Protection Threshold
						</h3>
						<span class="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-400">
							{appState.currentLimit} A
						</span>
					</div>
					<p class="text-xs text-slate-400">
						Dynamically sets trip point stored in ESP32 Flash NVS (<code class="text-cyan-400 font-mono text-[11px]">voltas/config/high_current_limit</code>).
					</p>
				</div>

				<!-- Quick Presets & Custom Input -->
				<div class="flex flex-wrap items-center gap-2">
					{#each [2.5, 3.0, 3.5, 4.0, 4.5, 5.0] as preset}
						<button
							type="button"
							disabled={!isOnline}
							onclick={() => handleSetLimit(preset)}
							class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all {appState.currentLimit === preset
								? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25 ring-2 ring-amber-400/50'
								: 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'} disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{preset}A
						</button>
					{/each}

					<div class="flex items-center gap-1.5 ml-1">
						<input
							type="number"
							step="0.1"
							min="0.5"
							max="10.0"
							bind:value={customLimit}
							disabled={!isOnline}
							class="w-16 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-center font-mono text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-40"
							placeholder="A"
						/>
						<button
							type="button"
							disabled={!isOnline || !customLimit || parseFloat(customLimit) === appState.currentLimit}
							onclick={() => handleSetLimit(customLimit)}
							class="rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition-colors disabled:opacity-30 disabled:pointer-events-none"
						>
							Set
						</button>
					</div>
				</div>
			</div>
		</section>

		<!-- ── 4-Channel Relay Controls ──────────────────────────────────────── -->
		<RelayGrid relays={appState.relays} disabled={!isOnline} />
	</main>

	<!-- Footer -->
	<footer
		class="border-t border-slate-800/60 px-4 py-4 text-center text-xs text-slate-500"
	>
		<span>VOLTAS ESP32 Relay & Power Dashboard</span>
	</footer>
</div>
