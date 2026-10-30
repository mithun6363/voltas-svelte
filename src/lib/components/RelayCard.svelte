<script>
	/**
	 * RelayCard.svelte
	 * A single relay toggle card.
	 *
	 * Props:
	 *   index    — 0-based relay index
	 *   label    — display name (e.g. "Relay 1")
	 *   icon     — emoji / SVG string shown in the card
	 *   state    — reactive boolean (is relay ON?)
	 *   onToggle — callback(index, newState)
	 *   disabled — grey-out when MQTT is disconnected
	 */

	let {
		index,
		label,
		icon,
		state = false,
		onToggle,
		disabled = false
	} = $props();

	function handleClick() {
		if (disabled) return;
		onToggle(index, !state);
	}
</script>

<button
	class="relay-card"
	class:on={state}
	class:disabled
	onclick={handleClick}
	aria-pressed={state}
	aria-label="{label} - {state ? 'ON' : 'OFF'}"
>
	<div class="relay-icon">{icon}</div>
	<div class="relay-label">{label}</div>

	<div class="relay-badge" class:badge-on={state} class:badge-off={!state}>
		{state ? 'ON' : 'OFF'}
	</div>

	<div class="relay-toggle">
		<div class="toggle-track" class:active={state}>
			<div class="toggle-thumb"></div>
		</div>
	</div>
</button>

<style>
	.relay-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.55rem;
		padding: 1.4rem 1rem;
		border-radius: 1.2rem;
		border: 2px solid var(--card-border, #2a2a3a);
		background: var(--card-bg, #1a1a2e);
		cursor: pointer;
		transition: all 0.25s ease;
		width: 100%;
		user-select: none;
		position: relative;
	}

	.relay-card:hover:not(.disabled) {
		border-color: #5865f2;
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(88, 101, 242, 0.25);
	}

	.relay-card.on {
		border-color: #3ecf8e;
		background: linear-gradient(135deg, #1a2e26 0%, #1a1a2e 100%);
		box-shadow: 0 4px 20px rgba(62, 207, 142, 0.2);
	}

	.relay-card.disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.relay-icon {
		font-size: 2.2rem;
		line-height: 1;
	}

	.relay-label {
		font-size: 1rem;
		font-weight: 700;
		color: #e0e0f0;
		letter-spacing: 0.03em;
	}

	.relay-badge {
		padding: 0.15rem 0.7rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.badge-on {
		background: rgba(62, 207, 142, 0.18);
		color: #3ecf8e;
	}

	.badge-off {
		background: rgba(255, 100, 100, 0.12);
		color: #ff6b6b;
	}

	/* Toggle switch */
	.relay-toggle {
		margin-top: 0.4rem;
	}

	.toggle-track {
		width: 42px;
		height: 22px;
		border-radius: 11px;
		background: #3a3a5a;
		position: relative;
		transition: background 0.25s ease;
	}

	.toggle-track.active {
		background: #3ecf8e;
	}

	.toggle-thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #fff;
		transition: transform 0.25s ease;
		box-shadow: 0 1px 4px rgba(0,0,0,0.3);
	}

	.toggle-track.active .toggle-thumb {
		transform: translateX(20px);
	}
</style>

