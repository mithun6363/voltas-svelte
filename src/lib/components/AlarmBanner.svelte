<script>
	/**
	 * AlarmBanner.svelte
	 * Displays trip/warning alarms (over-current, low battery, etc.).
	 *
	 * Props:
	 *   active — boolean
	 *   title — string
	 *   message — string
	 *   timestamp — string
	 *   type — 'danger' | 'warning'
	 *   icon — string
	 *   onDismiss — callback to clear/acknowledge
	 */

	let {
		active = false,
		title = 'OVER-CURRENT PROTECTION TRIGGERED',
		message = '',
		timestamp = '',
		type = 'danger',
		icon = '⚡⚠️',
		onDismiss
	} = $props();
</script>

{#if active}
	<div class="alarm-banner {type}" role="alert" aria-live="assertive">
		<div class="alarm-content">
			<div class="alarm-icon-box">
				<span class="alarm-icon">{icon}</span>
			</div>
			<div class="alarm-body">
				<div class="alarm-title">
					<span>{title}</span>
					{#if timestamp}
						<span class="alarm-time">at {timestamp}</span>
					{/if}
				</div>
				<p class="alarm-desc">{message}</p>
			</div>
		</div>

		{#if onDismiss}
			<button class="dismiss-btn" onclick={onDismiss} aria-label="Dismiss alarm">
				Acknowledge
			</button>
		{/if}
	</div>
{/if}

<style>
	.alarm-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.4rem;
		border-radius: 1rem;
		flex-wrap: wrap;
		transition: all 0.3s ease;
	}

	.alarm-banner.danger {
		background: linear-gradient(135deg, rgba(235, 57, 57, 0.22) 0%, rgba(136, 14, 14, 0.28) 100%);
		border: 2px solid #ff4d4d;
		box-shadow: 0 0 25px rgba(255, 77, 77, 0.25);
		animation: pulse-danger 1.5s infinite alternate ease-in-out;
	}

	.alarm-banner.warning {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(180, 83, 9, 0.28) 100%);
		border: 2px solid #f59e0b;
		box-shadow: 0 0 25px rgba(245, 158, 11, 0.25);
		animation: pulse-warning 1.5s infinite alternate ease-in-out;
	}

	@keyframes pulse-danger {
		0% {
			box-shadow: 0 0 10px rgba(255, 77, 77, 0.2);
			border-color: #ff4d4d;
		}
		100% {
			box-shadow: 0 0 30px rgba(255, 77, 77, 0.5);
			border-color: #ff7878;
		}
	}

	@keyframes pulse-warning {
		0% {
			box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
			border-color: #f59e0b;
		}
		100% {
			box-shadow: 0 0 30px rgba(245, 158, 11, 0.5);
			border-color: #fbbf24;
		}
	}

	.alarm-content {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		flex: 1;
		min-width: 260px;
	}

	.alarm-icon-box {
		font-size: 1.8rem;
		line-height: 1;
		animation: bounce 0.6s infinite alternate ease-in-out;
	}

	@keyframes bounce {
		0% { transform: scale(0.95); }
		100% { transform: scale(1.15); }
	}

	.alarm-body {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.alarm-title {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		font-size: 0.88rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.danger .alarm-title {
		color: #ff6b6b;
	}

	.warning .alarm-title {
		color: #fbbf24;
	}

	.alarm-time {
		font-size: 0.72rem;
		font-weight: 600;
		opacity: 0.8;
	}

	.alarm-desc {
		font-size: 0.84rem;
		line-height: 1.4;
	}

	.danger .alarm-desc {
		color: #ffdfdf;
	}

	.warning .alarm-desc {
		color: #fef3c7;
	}

	.dismiss-btn {
		color: #fff;
		border: none;
		border-radius: 0.5rem;
		padding: 0.45rem 1rem;
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		letter-spacing: 0.03em;
		transition: opacity 0.2s, transform 0.15s;
		white-space: nowrap;
	}

	.danger .dismiss-btn {
		background: #ff4d4d;
	}

	.warning .dismiss-btn {
		background: #d97706;
	}

	.dismiss-btn:hover {
		opacity: 0.88;
		transform: translateY(-1px);
	}
</style>
