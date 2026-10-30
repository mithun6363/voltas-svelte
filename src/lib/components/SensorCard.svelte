<script>
	/**
	 * SensorCard.svelte
	 * Displays a single sensor value (voltage, current, power, runtime).
	 *
	 * Props:
	 *   icon     — emoji
	 *   label    — e.g. "Voltage"
	 *   value    — e.g. "12.60"
	 *   unit     — e.g. "V"
	 *   accent   — CSS color string for the highlight bar
	 *   disabled — true when device is offline
	 */
	let { icon, label, value = '--', unit = '', accent = '#5865f2', disabled = false } = $props();
</script>

<div class="sensor-card" class:disabled>
	<div class="sensor-bar" style="background: {disabled ? '#3a3a5a' : accent}"></div>
	<div class="sensor-icon">{icon}</div>
	<div class="sensor-label">{label}</div>
	<div class="sensor-value">
		<span class="val" class:long-text={String(value).length > 5}>{value}</span>
		{#if value !== '--' && unit}
			<span class="unit">{unit}</span>
		{/if}
	</div>
</div>

<style>
	.sensor-card {
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.3rem;
		padding: 1.2rem 1.2rem 1.2rem 1.5rem;
		border-radius: 1rem;
		background: #1a1a2e;
		border: 1.5px solid #2a2a3a;
		transition: all 0.25s;
	}

	.sensor-card.disabled {
		opacity: 0.55;
		border-color: #222238;
	}

	.sensor-card:hover:not(.disabled) {
		border-color: #5865f2;
	}

	.sensor-bar {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 4px;
		border-radius: 4px 0 0 4px;
	}

	.sensor-icon {
		font-size: 1.5rem;
	}

	.sensor-label {
		font-size: 0.78rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #6b6b8a;
	}

	.sensor-value {
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
		margin-top: 0.2rem;
		max-width: 100%;
	}

	.val {
		font-size: 1.8rem;
		font-weight: 800;
		color: #e8e8f8;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.val.long-text {
		font-size: 1.45rem;
	}

	.unit {
		font-size: 0.95rem;
		font-weight: 600;
		color: #7a7a9a;
	}
</style>

