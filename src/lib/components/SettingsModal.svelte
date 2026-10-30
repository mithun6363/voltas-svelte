<script>
	/**
	 * SettingsModal.svelte
	 * Slide-over drawer / modal form for ESP32 NVS Configuration
	 */
	import { appState, saveSystemConfig, setLocalHost } from '#lib/connection.svelte.js';
	import { X, Save, Sliders, CheckCircle2, AlertCircle } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let { open = false, onClose } = $props();

	let hostInput = $state(appState.localHost);
	let vBat = $state(appState.config.v_bat);
	let rInt = $state(appState.config.r_int);
	let rLow = $state(appState.config.r_low);
	let ir1 = $state(appState.config.i_r1);
	let ir2 = $state(appState.config.i_r2);
	let ir3 = $state(appState.config.i_r3);
	let ir4 = $state(appState.config.i_r4);

	let saving = $state(false);
	let message = $state(/** @type {{ text: string, type: 'success' | 'error' } | null} */ (null));

	// Keep local inputs synced when modal opens
	$effect(() => {
		if (open) {
			hostInput = appState.localHost;
			vBat = appState.config.v_bat;
			rInt = appState.config.r_int;
			rLow = appState.config.r_low;
			ir1 = appState.config.i_r1;
			ir2 = appState.config.i_r2;
			ir3 = appState.config.i_r3;
			ir4 = appState.config.i_r4;
			message = null;
		}
	});

	async function handleSubmit(e) {
		e.preventDefault();
		saving = true;
		message = null;

		// Update local host target
		setLocalHost(hostInput);

		const success = await saveSystemConfig({
			v_bat: Number(vBat),
			r_int: Number(rInt),
			r_low: Number(rLow),
			i_r1: Number(ir1),
			i_r2: Number(ir2),
			i_r3: Number(ir3),
			i_r4: Number(ir4)
		});

		saving = false;
		if (success) {
			message = { text: 'Configuration saved to ESP32 Flash (NVS)!', type: 'success' };
			setTimeout(() => {
				onClose();
			}, 1200);
		} else {
			message = {
				text: 'Updated locally. (Note: Device unreachable via direct HTTP; parameters saved in dashboard)',
				type: 'error'
			};
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-end" role="dialog" aria-modal="true">
		<!-- Backdrop -->
		<button
			class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
			transition:fade={{ duration: 200 }}
			onclick={onClose}
			aria-label="Close modal"
		></button>

		<!-- Slide-over Drawer -->
		<div
			class="glass-panel relative flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900/95 p-6 shadow-2xl overflow-y-auto"
			transition:fly={{ x: 300, duration: 250 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-800 pb-4">
				<div class="flex items-center gap-2.5">
					<div class="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
						<Sliders class="h-4 w-4" />
					</div>
					<div>
						<h3 class="text-base font-bold text-white">System Settings</h3>
						<p class="text-xs text-slate-400">ESP32 NVS Flash Parameters</p>
					</div>
				</div>

				<button
					class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
					onclick={onClose}
					aria-label="Close"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Status message -->
			{#if message}
				<div
					class="mt-4 flex items-center gap-2 rounded-xl p-3 text-xs font-medium border
					{message.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' : 'bg-amber-950/40 border-amber-500/30 text-amber-400'}"
				>
					{#if message.type === 'success'}
						<CheckCircle2 class="h-4 w-4 shrink-0" />
					{:else}
						<AlertCircle class="h-4 w-4 shrink-0" />
					{/if}
					<span>{message.text}</span>
				</div>
			{/if}

			<!-- Form -->
			<form class="mt-6 flex-1 space-y-5" onsubmit={handleSubmit}>
				<!-- Direct Host Address -->
				<div>
					<label for="host" class="block text-xs font-semibold uppercase tracking-wider text-slate-400">
						Direct ESP32 Host / IP
					</label>
					<input
						id="host"
						type="text"
						bind:value={hostInput}
						placeholder="http://voltas.local or 192.168.1.xxx"
						class="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none font-mono"
					/>
					<p class="mt-1 text-[11px] text-slate-500">Used for direct Local HTTP REST polling and control.</p>
				</div>

				<!-- Relay Active Logic -->
				<div>
					<span class="block text-xs font-semibold uppercase tracking-wider text-slate-400">
						Relay Hardware Logic
					</span>
					<div class="mt-2 grid grid-cols-2 gap-2">
						<button
							type="button"
							class="rounded-xl border p-2.5 text-xs font-semibold transition-all {rLow === 1 ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'}"
							onclick={() => (rLow = 1)}
						>
							Active LOW (Standard)
						</button>
						<button
							type="button"
							class="rounded-xl border p-2.5 text-xs font-semibold transition-all {rLow === 0 ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'}"
							onclick={() => (rLow = 0)}
						>
							Active HIGH
						</button>
					</div>
				</div>

				<!-- Battery Physics -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="v_bat" class="block text-xs font-semibold uppercase tracking-wider text-slate-400">
							Nominal V (V)
						</label>
						<input
							id="v_bat"
							type="number"
							step="0.05"
							bind:value={vBat}
							class="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono"
						/>
					</div>
					<div>
						<label for="r_int" class="block text-xs font-semibold uppercase tracking-wider text-slate-400">
							R_int (&Omega;)
						</label>
						<input
							id="r_int"
							type="number"
							step="0.005"
							bind:value={rInt}
							class="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono"
						/>
					</div>
				</div>

				<!-- Dynamic Relay Current Loads -->
				<div>
					<span class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
						Simulated Relay Current (Amps)
					</span>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="i_r1" class="text-[11px] text-slate-400">Relay 1 (A)</label>
							<input
								id="i_r1"
								type="number"
								step="0.1"
								bind:value={ir1}
								class="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-sm text-white font-mono"
							/>
						</div>
						<div>
							<label for="i_r2" class="text-[11px] text-slate-400">Relay 2 (A)</label>
							<input
								id="i_r2"
								type="number"
								step="0.1"
								bind:value={ir2}
								class="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-sm text-white font-mono"
							/>
						</div>
						<div>
							<label for="i_r3" class="text-[11px] text-slate-400">Relay 3 (A)</label>
							<input
								id="i_r3"
								type="number"
								step="0.1"
								bind:value={ir3}
								class="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-sm text-white font-mono"
							/>
						</div>
						<div>
							<label for="i_r4" class="text-[11px] text-slate-400">Relay 4 (A)</label>
							<input
								id="i_r4"
								type="number"
								step="0.1"
								bind:value={ir4}
								class="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-sm text-white font-mono"
							/>
						</div>
					</div>
				</div>

				<!-- Save Action -->
				<div class="pt-4">
					<button
						type="submit"
						disabled={saving}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:opacity-90 disabled:opacity-50"
					>
						<Save class="h-4 w-4" />
						<span>{saving ? 'Saving...' : 'Save Settings to ESP32'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

