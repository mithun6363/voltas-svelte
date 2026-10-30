<script>
	/**
	 * +page.svelte  ─  Voltas MQTT Dashboard (SvelteKit 5, runes mode)
	 *
	 * Connects to broker.emqx.io via WebSocket (wss://broker.emqx.io:8084/mqtt)
	 * and provides:
	 *   • Real-time sensor readings  (voltage / current / power)
	 *   • 4-channel relay control    (toggle ON/OFF)
	 *   • Connection status bar      (connect / disconnect / error)
	 */

	import { onMount, onDestroy } from 'svelte';
	import { mqttState, connectMQTT, disconnectMQTT, setRelay } from '#lib/mqtt.svelte.js';
	import StatusBar from '#lib/components/StatusBar.svelte';
	import SensorCard from '#lib/components/SensorCard.svelte';
	import RelayCard from '#lib/components/RelayCard.svelte';
	import DeviceStatus from '#lib/components/DeviceStatus.svelte';

	// Relay display metadata
	const RELAYS = [
		{ label: 'Relay 1', icon: '💡' },
		{ label: 'Relay 2', icon: '🔌' },
		{ label: 'Relay 3', icon: '🌀' },
		{ label: 'Relay 4', icon: '🔋' }
	];

	// Auto-connect when the page mounts
	onMount(() => {
		connectMQTT();
	});

	onDestroy(() => {
		disconnectMQTT();
	});

	/** True only when both frontend MQTT is connected AND the ESP32 is confirmed online */
	const isOnline = $derived(mqttState.connected && mqttState.deviceStatus === 'online');

	/** Derived: how many relays are currently ON (only counted when online) */
	const activeCount = $derived(isOnline ? mqttState.relays.filter(Boolean).length : 0);

	/** Turn all relays ON */
	function allOn() {
		if (!isOnline) return;
		for (let i = 0; i < 4; i++) setRelay(i, true);
	}

	/** Turn all relays OFF */
	function allOff() {
		if (!isOnline) return;
		for (let i = 0; i < 4; i++) setRelay(i, false);
	}
</script>

<svelte:head>
	<title>Voltas MQTT Dashboard</title>
</svelte:head>

<div class="app">
	<!-- ── Header / Status Bar ─────────────────────────────────────────────── -->
	<StatusBar
		connected={mqttState.connected}
		connecting={mqttState.connecting}
		error={mqttState.error}
		lastSeen={mqttState.lastSeen}
		onConnect={connectMQTT}
		onDisconnect={disconnectMQTT}
	/>

	<main class="dashboard">

		<!-- ── ESP32 Device Status ──────────────────────────────────────────── -->
		<DeviceStatus status={mqttState.deviceStatus} />

		<!-- ── Sensor Cards ─────────────────────────────────────────────────── -->
		<section class="section">
			<h2 class="section-title">📊 Live Readings</h2>
			<div class="sensor-grid">
				<SensorCard
					icon="🔋"
					label="Voltage"
					value={isOnline ? mqttState.voltage : '--'}
					unit="V"
					accent="#5865f2"
					disabled={!isOnline}
				/>
				<SensorCard
					icon="⚡"
					label="Current"
					value={isOnline ? mqttState.current : '--'}
					unit="A"
					accent="#f0b429"
					disabled={!isOnline}
				/>
				<SensorCard
					icon="💥"
					label="Power"
					value={isOnline ? mqttState.power : '--'}
					unit="W"
					accent="#3ecf8e"
					disabled={!isOnline}
				/>
			</div>
		</section>

		<!-- ── Relay Controls ────────────────────────────────────────────────── -->
		<section class="section">
			<div class="relay-header">
				<h2 class="section-title">🎛️ Relay Control</h2>
				<div class="relay-summary">
					<span class="active-badge">
						{activeCount} / 4 active
					</span>
					<button
						class="bulk-btn bulk-on"
						onclick={allOn}
						disabled={!isOnline}
					>All ON</button>
					<button
						class="bulk-btn bulk-off"
						onclick={allOff}
						disabled={!isOnline}
					>All OFF</button>
				</div>
			</div>

			<div class="relay-grid">
				{#each RELAYS as relay, i}
					<RelayCard
						index={i}
						label={relay.label}
						icon={relay.icon}
						state={isOnline ? mqttState.relays[i] : false}
						onToggle={setRelay}
						disabled={!isOnline}
					/>
				{/each}
			</div>
		</section>

		<!-- ── MQTT Info Panel ──────────────────────────────────────────────── -->
		<section class="section">
			<h2 class="section-title">🔗 Connection Info</h2>
			<div class="info-grid">
				<div class="info-row">
					<span class="info-key">Broker</span>
					<span class="info-val">broker.emqx.io</span>
				</div>
				<div class="info-row">
					<span class="info-key">Transport</span>
					<span class="info-val">WebSocket (WSS :8084)</span>
				</div>
				<div class="info-row">
					<span class="info-key">Command topics</span>
					<span class="info-val">voltas/relay/1 … 4</span>
				</div>
				<div class="info-row">
					<span class="info-key">Sensor topics</span>
					<span class="info-val">voltas/sensors/voltage|current|power</span>
				</div>
				<div class="info-row">
					<span class="info-key">Status topic</span>
					<span class="info-val">voltas/relay/status (JSON)</span>
				</div>
				<div class="info-row">
					<span class="info-key">Device LWT</span>
					<span class="info-val">voltas/status → online / offline</span>
				</div>
			</div>
		</section>

	</main>

	<footer class="footer">
		<span>ESP32 · 4-Channel Relay · MQTT · Voltas</span>
	</footer>
</div>

<style>
	/* ── Reset / Root ──────────────────────────────────────────────────────── */
	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: 'Inter', system-ui, -apple-system, sans-serif;
		background: #0d0d1a;
		color: #c8c8e8;
		min-height: 100dvh;
	}

	/* ── App shell ─────────────────────────────────────────────────────────── */
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.dashboard {
		flex: 1;
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	/* ── Section ───────────────────────────────────────────────────────────── */
	.section-title {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: #9090b8;
		text-transform: uppercase;
		margin-bottom: 1rem;
	}

	/* ── Sensor grid ───────────────────────────────────────────────────────── */
	.sensor-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	/* ── Relay section header ──────────────────────────────────────────────── */
	.relay-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}

	.relay-header .section-title {
		margin-bottom: 0;
	}

	.relay-summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.active-badge {
		font-size: 0.78rem;
		font-weight: 700;
		background: rgba(88, 101, 242, 0.15);
		color: #8892f8;
		border-radius: 999px;
		padding: 0.2rem 0.75rem;
	}

	.bulk-btn {
		font-size: 0.78rem;
		font-weight: 700;
		padding: 0.3rem 0.85rem;
		border-radius: 0.5rem;
		border: none;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.bulk-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.bulk-on {
		background: rgba(62, 207, 142, 0.18);
		color: #3ecf8e;
	}

	.bulk-on:hover:not(:disabled) {
		background: rgba(62, 207, 142, 0.3);
	}

	.bulk-off {
		background: rgba(255, 100, 100, 0.14);
		color: #ff6b6b;
	}

	.bulk-off:hover:not(:disabled) {
		background: rgba(255, 100, 100, 0.28);
	}

	/* ── Relay grid ────────────────────────────────────────────────────────── */
	.relay-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 1rem;
	}

	/* ── Info panel ────────────────────────────────────────────────────────── */
	.info-grid {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		background: #1a1a2e;
		border: 1.5px solid #2a2a3a;
		border-radius: 1rem;
		padding: 1.1rem 1.25rem;
	}

	.info-row {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		font-size: 0.82rem;
	}

	.info-key {
		min-width: 120px;
		font-weight: 700;
		color: #5a5a8a;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 0.72rem;
	}

	.info-val {
		color: #a8a8d0;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		word-break: break-all;
	}

	/* ── Footer ────────────────────────────────────────────────────────────── */
	.footer {
		text-align: center;
		padding: 1rem;
		font-size: 0.72rem;
		color: #3a3a5a;
		border-top: 1px solid #1e1e32;
	}
</style>
