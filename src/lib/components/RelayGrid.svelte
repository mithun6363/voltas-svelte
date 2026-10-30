<script>
	/**
	 * RelayGrid.svelte
	 * Grid of 4 relays with individual and bulk controls
	 */
	import RelayCard from './RelayCard.svelte';
	import { toggleRelay } from '#lib/connection.svelte.js';
	import { CheckCheck, XCircle } from 'lucide-svelte';

	let { relays = [false, false, false, false], disabled = false } = $props();

	const RELAY_CONFIG = [
		{ label: 'Relay 1', gpio: 26 },
		{ label: 'Relay 2', gpio: 27 },
		{ label: 'Relay 3', gpio: 14 },
		{ label: 'Relay 4', gpio: 12 }
	];

	const activeCount = $derived(relays.filter(Boolean).length);

	function allOn() {
		if (disabled) return;
		for (let i = 0; i < 4; i++) toggleRelay(i, true);
	}

	function allOff() {
		if (disabled) return;
		for (let i = 0; i < 4; i++) toggleRelay(i, false);
	}
</script>

<section class="space-y-4">
	<!-- Header & Quick Bulk Controls -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-2.5">
			<h3 class="text-sm font-bold tracking-wider text-slate-300 uppercase">Relay Controls</h3>
			<span class="rounded-full bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-0.5 text-xs font-semibold text-cyan-400">
				{activeCount} of 4 Active
			</span>
		</div>

		<div class="flex items-center gap-2">
			<button
				class="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-900/40 hover:border-emerald-500/60 disabled:opacity-40 disabled:pointer-events-none"
				onclick={allOn}
				{disabled}
			>
				<CheckCheck class="h-3.5 w-3.5" />
				<span>All ON</span>
			</button>
			<button
				class="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-400 transition-all hover:bg-rose-900/40 hover:border-rose-500/60 disabled:opacity-40 disabled:pointer-events-none"
				onclick={allOff}
				{disabled}
			>
				<XCircle class="h-3.5 w-3.5" />
				<span>All OFF</span>
			</button>
		</div>
	</div>

	<!-- 4-Channel Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each RELAY_CONFIG as r, i}
			<RelayCard
				index={i}
				label={r.label}
				gpio={r.gpio}
				state={relays[i]}
				{disabled}
				onToggle={toggleRelay}
			/>
		{/each}
	</div>
</section>

