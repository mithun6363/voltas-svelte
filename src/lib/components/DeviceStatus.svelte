<script>
	/**
	 * DeviceStatus.svelte
	 * Banner showing ESP32 online / offline / unknown state
	 * sourced from the MQTT LWT topic voltas/status.
	 *
	 * Props:
	 *   status — 'online' | 'offline' | 'unknown'
	 */
	let { status = 'unknown' } = $props();

	const cfg = $derived(
		status === 'online'
			? { color: '#3ecf8e', bg: 'rgba(62,207,142,0.10)', icon: '🟢', label: 'Online', sub: 'ESP32 is connected and publishing' }
			: status === 'offline'
				? { color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)', icon: '🔴', label: 'Offline', sub: 'Last Will triggered — device disconnected' }
				: { color: '#f0b429', bg: 'rgba(240,180,41,0.10)', icon: '🟡', label: 'Unknown', sub: 'Waiting for voltas/status message…' }
	);
</script>

<div class="device-status" style="border-color:{cfg.color}; background:{cfg.bg}">
	<div class="ds-left">
		<span class="ds-icon">{cfg.icon}</span>
		<div class="ds-text">
			<span class="ds-label" style="color:{cfg.color}">ESP32 · {cfg.label}</span>
			<span class="ds-sub">{cfg.sub}</span>
		</div>
	</div>

	{#if status === 'online'}
		<span class="ds-pulse" style="background:{cfg.color}"></span>
	{/if}
</div>

<style>
	.device-status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1.2rem;
		border-radius: 1rem;
		border: 1.5px solid;
		transition: all 0.4s ease;
	}

	.ds-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.ds-icon {
		font-size: 1.3rem;
		line-height: 1;
	}

	.ds-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.ds-label {
		font-size: 0.9rem;
		font-weight: 800;
		letter-spacing: 0.03em;
	}

	.ds-sub {
		font-size: 0.72rem;
		color: #6a6a8a;
	}

	/* Pulsing dot for online state */
	.ds-pulse {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		animation: ds-blink 2s ease-in-out infinite;
	}

	@keyframes ds-blink {
		0%, 100% { opacity: 1; transform: scale(1); }
		50%       { opacity: 0.3; transform: scale(0.7); }
	}
</style>

