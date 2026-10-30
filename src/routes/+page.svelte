<script>
	/**
	 * +page.svelte  ─  Core ESP32 IoT Control Dashboard
	 */
	import { onMount, onDestroy } from "svelte";
	import {
		appState,
		initConnection,
		destroyConnection,
	} from "#lib/connection.svelte.js";
	import Header from "#lib/components/Header.svelte";
	import TelemetryCard from "#lib/components/TelemetryCard.svelte";
	import RelayGrid from "#lib/components/RelayGrid.svelte";

	import { Zap, Gauge, Clock, Cpu, Thermometer } from "lucide-svelte";

	onMount(() => {
		initConnection();
	});

	onDestroy(() => {
		destroyConnection();
	});

	const isOnline = $derived(appState.status === "ONLINE");
</script>

<svelte:head>
	<title>Voltas IoT | ESP32 Relay & Power Control</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-[#07090e] text-slate-100">
	<!-- Top Bar -->
	<Header />

	<!-- Core Dashboard Content -->
	<main class="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
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
					subtext={isOnline ? "Load Current" : "Offline"}
					percentage={isOnline
						? (parseFloat(appState.current) / 4.0) * 100
						: 0}
					color="amber"
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
