<script>
	/**
	 * StatusBar.svelte
	 * Top status bar showing MQTT connection state.
	 *
	 * Props:
	 *   connected   boolean
	 *   connecting  boolean
	 *   error       string | null
	 *   lastSeen    string | null  (time of last message)
	 *   onConnect   callback
	 *   onDisconnect callback
	 */
	let { connected, connecting, error, lastSeen, onConnect, onDisconnect } = $props();
</script>

<header class="status-bar">
	<div class="brand">
		<span class="brand-icon">⚡</span>
		<span class="brand-name">Voltas MQTT Dashboard</span>
	</div>

	<div class="status-right">
		{#if lastSeen}
			<span class="last-seen">Last msg: {lastSeen}</span>
		{/if}

		<div class="status-dot-wrap">
			<span
				class="dot"
				class:dot-green={connected}
				class:dot-yellow={connecting && !connected}
				class:dot-red={!connected && !connecting}
			></span>
			<span class="status-text">
				{#if connected}
					Connected
				{:else if connecting}
					Connecting…
				{:else}
					Disconnected
				{/if}
			</span>
		</div>

		{#if error}
			<span class="error-badge" title={error}>⚠ Error</span>
		{/if}

		{#if connected}
			<button class="btn btn-danger" onclick={onDisconnect}>Disconnect</button>
		{:else}
			<button class="btn btn-primary" onclick={onConnect} disabled={connecting}>
				{connecting ? 'Connecting…' : 'Connect'}
			</button>
		{/if}
	</div>
</header>

<style>
	.status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.9rem 1.5rem;
		background: #12122a;
		border-bottom: 1.5px solid #2a2a3a;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.brand-icon {
		font-size: 1.4rem;
	}

	.brand-name {
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: 0.03em;
		color: #e8e8f8;
	}

	.status-right {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		flex-wrap: wrap;
	}

	.last-seen {
		font-size: 0.72rem;
		color: #5a5a7a;
	}

	.status-dot-wrap {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.dot-green {
		background: #3ecf8e;
		box-shadow: 0 0 6px #3ecf8e;
		animation: pulse 2s infinite;
	}

	.dot-yellow {
		background: #f0b429;
		box-shadow: 0 0 6px #f0b429;
		animation: pulse 1s infinite;
	}

	.dot-red {
		background: #ff6b6b;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0.4; }
	}

	.status-text {
		font-size: 0.82rem;
		font-weight: 600;
		color: #a0a0c0;
	}

	.error-badge {
		font-size: 0.72rem;
		background: rgba(255, 100, 100, 0.15);
		color: #ff6b6b;
		border-radius: 6px;
		padding: 0.1rem 0.5rem;
	}

	/* Buttons */
	.btn {
		font-size: 0.82rem;
		font-weight: 700;
		padding: 0.38rem 1rem;
		border-radius: 0.5rem;
		border: none;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #5865f2;
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.85;
	}

	.btn-danger {
		background: rgba(255, 100, 100, 0.18);
		color: #ff6b6b;
	}

	.btn-danger:hover {
		background: rgba(255, 100, 100, 0.3);
	}
</style>

