<script>
	/**
	 * +page.svelte  ─  Voltas IoT Full-Stack SvelteKit Dashboard
	 */
	import { onMount, onDestroy } from 'svelte';
	import { appState, initConnection, destroyConnection, clearAlarms } from '#lib/connection.svelte.js';
	import Header from '#lib/components/Header.svelte';
	import TelemetryCard from '#lib/components/TelemetryCard.svelte';
	import RelayGrid from '#lib/components/RelayGrid.svelte';
	import LiveChart from '#lib/components/LiveChart.svelte';
	import AlarmBanner from '#lib/components/AlarmBanner.svelte';

	import { BatteryCharging, Zap, Gauge, Clock, Cpu } from 'lucide-svelte';

	onMount(() => {
		initConnection();
	});

	onDestroy(() => {
		destroyConnection();
	});

	const isOnline = $derived(appState.status === 'ONLINE');
</script>

<svelte:head>
	<title>Voltas IoT | ESP32 Smart Relay & Battery Monitor</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-[#07090e] text-slate-100">
	<!-- Top Bar -->
	<Header />

	<!-- Main Content Area -->
	<main class="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">

		<!-- Over-Current Alarm Banner -->
		<AlarmBanner
			active={isOnline && appState.overCurrentAlarm}
			title="OVER-CURRENT PROTECTION TRIGGERED"
			type="danger"
			icon="⚡⚠️"
			message={appState.alarmMessage}
			timestamp={appState.alarmTimestamp || ''}
			onDismiss={clearAlarms}
		/>

		<!-- Low-Battery Alarm Banner -->
		<AlarmBanner
			active={isOnline && appState.lowBatteryAlarm}
			title="LOW BATTERY WARNING (12V 14Ah SPEC)"
			type="warning"
			icon="🪫⚠️"
			message={appState.lowBatteryMessage}
			timestamp={appState.lastSeen || ''}
			onDismiss={clearAlarms}
		/>

		<!-- ── Live Telemetry Cards Grid ──────────────────────────────────────── -->
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="text-xs font-bold tracking-wider text-slate-400 uppercase">Live Sensor Telemetry</h2>
				{#if isOnline}
					<span class="text-xs font-mono text-cyan-400 font-medium">Nominal: {appState.v_nominal.toFixed(2)}V</span>
				{/if}
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
				<!-- Loaded Voltage -->
				<TelemetryCard
					title="Loaded Voltage"
					value={isOnline ? appState.v_actual.toFixed(2) : '--'}
					unit="V"
					subtext={isOnline ? `Sag: -${Math.max(0, appState.v_nominal - appState.v_actual).toFixed(2)}V` : 'Offline'}
					percentage={isOnline ? ((appState.v_actual - 10.0) / 3.0) * 100 : 0}
					color="cyan"
					disabled={!isOnline}
				>
					{#snippet icon()}
						<Gauge class="h-4 w-4" />
					{/snippet}
				</TelemetryCard>

				<!-- Total Current -->
				<TelemetryCard
					title="Total Current"
					value={isOnline ? appState.current.toFixed(2) : '--'}
					unit="A"
					subtext={isOnline ? `Limit: 3.50A` : 'Offline'}
					percentage={isOnline ? (appState.current / 4.0) * 100 : 0}
					color="amber"
					disabled={!isOnline}
				>
					{#snippet icon()}
						<Zap class="h-4 w-4" />
					{/snippet}
				</TelemetryCard>

				<!-- Total Power -->
				<TelemetryCard
					title="Power Draw"
					value={isOnline ? appState.power.toFixed(2) : '--'}
					unit="W"
					subtext={isOnline ? `P = V × I` : 'Offline'}
					percentage={isOnline ? (appState.power / 50.0) * 100 : 0}
					color="green"
					disabled={!isOnline}
				>
					{#snippet icon()}
						<Cpu class="h-4 w-4" />
					{/snippet}
				</TelemetryCard>

				<!-- Battery SoC -->
				<TelemetryCard
					title="Battery Health"
					value={isOnline ? `${appState.soc}` : '--'}
					unit="%"
					subtext="12V · 14Ah (168Wh)"
					percentage={isOnline ? appState.soc : 0}
					color="cyan"
					disabled={!isOnline}
				>
					{#snippet icon()}
						<BatteryCharging class="h-4 w-4" />
					{/snippet}
				</TelemetryCard>

				<!-- Est. Remaining Runtime -->
				<TelemetryCard
					title="Est. Runtime"
					value={isOnline ? appState.runtime : '--'}
					unit=""
					subtext="Peukert Discharge Model"
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

		<!-- ── Live Scrolling Chart ──────────────────────────────────────────── -->
		<LiveChart history={appState.history} />

		<!-- ── 4-Channel Relay Controls ──────────────────────────────────────── -->
		<RelayGrid relays={appState.relays} disabled={!isOnline} />

	</main>

	<!-- Footer -->
	<footer class="border-t border-slate-800/60 px-4 py-4 text-center text-xs text-slate-500">
		<span>VOLTAS ESP32 Smart Relay & 12V 14Ah Power Dashboard · SvelteKit 5 + Tailwind CSS</span>
	</footer>
</div>
