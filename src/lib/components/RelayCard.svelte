<script>
	/**
	 * RelayCard.svelte
	 * Interactive Relay Switch Card with Optimistic Feedback
	 */
	import { Zap, Power } from 'lucide-svelte';

	let {
		index = 0,
		label = '',
		gpio = 0,
		state = false,
		disabled = false,
		onToggle
	} = $props();

	function handleClick() {
		if (disabled) return;
		onToggle(index, !state);
	}
</script>

<div
	class="glass-card relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-300
	{state
		? 'border-emerald-500/40 bg-gradient-to-b from-slate-900/90 to-emerald-950/20 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
		: 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'}
	{disabled ? 'opacity-45 cursor-not-allowed pointer-events-none' : ''}"
>
	<!-- Top Bar: Channel Icon & GPIO Label -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2.5">
			<div class="flex h-9 w-9 items-center justify-center rounded-xl border transition-colors
				{state ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400' : 'border-slate-700/60 bg-slate-800/50 text-slate-400'}">
				<Zap class="h-4 w-4 {state ? 'animate-pulse' : ''}" />
			</div>
			<div>
				<h4 class="text-sm font-bold text-white tracking-wide">{label}</h4>
				<span class="text-[11px] font-mono text-slate-400">GPIO {gpio}</span>
			</div>
		</div>

		<!-- Status Badge -->
		<span class="rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase transition-colors
			{state
				? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
				: 'bg-slate-800 text-slate-400 border border-slate-700'}">
			{state ? 'ON' : 'OFF'}
		</span>
	</div>

	<!-- Bottom Bar: Toggle Switch Button -->
	<div class="mt-6 flex items-center justify-between border-t border-slate-800/60 pt-4">
		<span class="text-xs font-medium text-slate-400">Control Switch</span>
		
		<button
			type="button"
			role="switch"
			aria-checked={state}
			onclick={handleClick}
			class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
			{state ? 'bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-slate-700'}"
		>
			<span class="sr-only">Toggle {label}</span>
			<span
				class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out
				{state ? 'translate-x-5' : 'translate-x-0'}"
			>
				<Power class="h-3 w-3 m-1.5 text-slate-700" />
			</span>
		</button>
	</div>
</div>
