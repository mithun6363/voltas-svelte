/**
 * connection.svelte.js
 * Cloud MQTT Telemetry & Control Engine (Svelte 5 Runes)
 */

import mqtt from 'mqtt';

// ─── Broker & Battery Constants ───────────────────────────────────────────────
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const CLIENT_ID = `voltas-dashboard-${Math.random().toString(16).slice(2, 10)}`;

// 12V 14Ah Battery Specification
export const BATTERY_CAPACITY_AH = 14.0;
export const BATTERY_FULL_V = 12.70;
export const BATTERY_CUTOFF_V = 10.50;
export const BATTERY_CRITICAL_V = 11.20;
export const OVER_CURRENT_THRESHOLD = 3.50; // Amperes

// Internal Topics (MQTT details kept private from UI)
const TOPIC_VOLTAGE = 'voltas/sensors/voltage';
const TOPIC_CURRENT = 'voltas/sensors/current';
const TOPIC_POWER = 'voltas/sensors/power';
const TOPIC_RELAY_STATUS = 'voltas/relay/status';
const TOPIC_DEVICE_STATUS = 'voltas/status'; // LWT topic
const TOPIC_RELAY_CMD = ['voltas/relay/1', 'voltas/relay/2', 'voltas/relay/3', 'voltas/relay/4'];
const TOPIC_ALARM = 'voltas/alarm/overcurrent';

/**
 * Calculates battery State of Charge (% SoC) compensated for load sag
 */
export function calculateSoC(voltage, current = 0) {
	if (isNaN(voltage) || voltage <= 0) return 0;
	const voc = voltage + (current * 0.08);
	const raw = ((voc - BATTERY_CUTOFF_V) / (BATTERY_FULL_V - BATTERY_CUTOFF_V)) * 100;
	return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Calculates human-readable remaining run time (12V 14Ah spec)
 */
export function calculateRuntime(voltage, current) {
	if (isNaN(current) || current <= 0.05) return 'Idle (No load)';
	if (isNaN(voltage) || voltage <= BATTERY_CUTOFF_V) return '< 5m (Empty)';
	const soc = calculateSoC(voltage, current) / 100;
	const remainingAh = BATTERY_CAPACITY_AH * Math.max(0.02, soc);
	const effectiveI = Math.pow(current, 1.05); // Peukert compensation
	const hours = remainingAh / effectiveI;
	if (hours > 99) return '> 99h';
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// ─── Reactive State (Svelte 5 Runes) ──────────────────────────────────────────
export const appState = $state({
	// Device status: 'ONLINE' | 'OFFLINE' | 'CONNECTING'
	status: 'CONNECTING',
	error: /** @type {string|null} */ (null),
	lastSeen: /** @type {string|null} */ (null),

	// Live Telemetry
	v_nominal: 12.60,
	v_actual: 0.0,
	current: 0.0,
	power: 0.0,
	soc: 0,
	runtime: '--',

	// Relays [0..3]
	relays: [false, false, false, false],

	// Alarms
	overCurrentAlarm: false,
	alarmMessage: '',
	alarmTimestamp: /** @type {string|null} */ (null),
	lowBatteryAlarm: false,
	lowBatteryMessage: '',

	// Rolling 60-second telemetry history for live charts
	/** @type {Array<{ time: string, timestamp: number, voltage: number, current: number, power: number }>} */
	history: [],

	// Settings configuration (stored in state)
	config: {
		v_bat: 12.60,
		r_int: 0.08,
		r_low: 1,
		i_r1: 1.0,
		i_r2: 2.5,
		i_r3: 0.5,
		i_r4: 0.8
	}
});

// ─── Internal References ──────────────────────────────────────────────────────
/** @type {import('mqtt').MqttClient|null} */
let mqttClient = null;
/** @type {Array<number|null>} */
const optimisticTimers = [null, null, null, null];

function recordTelemetryPoint(v, c, p) {
	const now = new Date();
	const point = {
		time: now.toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
		timestamp: Date.now(),
		voltage: Number(v.toFixed(2)),
		current: Number(c.toFixed(2)),
		power: Number(p.toFixed(2))
	};

	appState.history.push(point);
	if (appState.history.length > 60) {
		appState.history.shift();
	}
}

function processTelemetry(vActual, current, power) {
	appState.status = 'ONLINE';
	appState.lastSeen = new Date().toLocaleTimeString();
	appState.v_actual = vActual;
	appState.current = current;
	appState.power = power;

	appState.soc = calculateSoC(vActual, current);
	appState.runtime = calculateRuntime(vActual, current);

	recordTelemetryPoint(vActual, current, power);

	// Over-current protection logic
	if (current > OVER_CURRENT_THRESHOLD) {
		triggerOverCurrentProtection(current);
	} else if (appState.overCurrentAlarm && current <= OVER_CURRENT_THRESHOLD - 0.4) {
		appState.overCurrentAlarm = false;
	}

	// Low-battery alarm check
	if (vActual > 0 && (vActual <= BATTERY_CRITICAL_V || appState.soc <= 15)) {
		appState.lowBatteryAlarm = true;
		appState.lowBatteryMessage = `Low Battery: ${vActual.toFixed(2)}V (${appState.soc}%). Below 11.20V threshold!`;
	} else if (vActual > BATTERY_CRITICAL_V + 0.3) {
		appState.lowBatteryAlarm = false;
	}
}

function triggerOverCurrentProtection(c) {
	appState.overCurrentAlarm = true;
	appState.alarmTimestamp = new Date().toLocaleTimeString();

	// Automatically shut off highest load: Relay 2 first, then 1, 4, 3
	const priorityOrder = [1, 0, 3, 2];
	let shedIndex = -1;
	for (const idx of priorityOrder) {
		if (appState.relays[idx]) {
			shedIndex = idx;
			toggleRelay(idx, false);
			break;
		}
	}

	if (shedIndex >= 0) {
		appState.alarmMessage = `OVER-CURRENT ALARM: ${c.toFixed(2)}A exceeded ${OVER_CURRENT_THRESHOLD}A limit. High load Relay ${shedIndex + 1} automatically switched OFF.`;
	} else {
		appState.alarmMessage = `OVER-CURRENT ALERT: Total current (${c.toFixed(2)}A) exceeds safe limit (${OVER_CURRENT_THRESHOLD}A).`;
	}
}

// ─── Connection Lifecycle ─────────────────────────────────────────────────────
export function initConnection() {
	if (mqttClient) return;

	appState.status = 'CONNECTING';
	mqttClient = mqtt.connect(BROKER_URL, {
		clientId: CLIENT_ID,
		clean: true,
		keepalive: 60,
		reconnectPeriod: 4000,
		connectTimeout: 10_000
	});

	mqttClient.on('connect', () => {
		appState.status = 'ONLINE';
		appState.error = null;

		const topics = [
			TOPIC_VOLTAGE,
			TOPIC_CURRENT,
			TOPIC_POWER,
			TOPIC_RELAY_STATUS,
			TOPIC_DEVICE_STATUS,
			TOPIC_ALARM,
			...TOPIC_RELAY_CMD
		];
		mqttClient?.subscribe(topics, { qos: 1 });
	});

	mqttClient.on('message', (topic, payload) => {
		const msg = payload.toString().trim();
		appState.lastSeen = new Date().toLocaleTimeString();

		if (topic === TOPIC_DEVICE_STATUS) {
			const isOnline = msg.toLowerCase() === 'online';
			appState.status = isOnline ? 'ONLINE' : 'OFFLINE';
			if (!isOnline) {
				resetLiveTelemetry();
			}
			return;
		}

		if (topic === TOPIC_VOLTAGE) {
			const v = parseFloat(msg) || 0;
			processTelemetry(v, appState.current, appState.power);
		} else if (topic === TOPIC_CURRENT) {
			const c = parseFloat(msg) || 0;
			processTelemetry(appState.v_actual, c, appState.power);
		} else if (topic === TOPIC_POWER) {
			const p = parseFloat(msg) || 0;
			processTelemetry(appState.v_actual, appState.current, p);
		} else if (topic === TOPIC_RELAY_STATUS) {
			try {
				const d = JSON.parse(msg);
				for (let i = 0; i < 4; i++) {
					const state = d[`relay${i + 1}`] === 'ON';
					appState.relays[i] = state;
					if (optimisticTimers[i]) {
						clearTimeout(optimisticTimers[i]);
						optimisticTimers[i] = null;
					}
				}
			} catch {
				// ignore malformed
			}
		} else if (topic === TOPIC_ALARM) {
			try {
				const d = JSON.parse(msg);
				appState.overCurrentAlarm = Boolean(d.alarm);
				if (d.message) appState.alarmMessage = d.message;
				appState.alarmTimestamp = new Date().toLocaleTimeString();
			} catch {
				appState.overCurrentAlarm = msg.toUpperCase().includes('ALARM');
				appState.alarmMessage = msg;
			}
		} else {
			const idx = TOPIC_RELAY_CMD.indexOf(topic);
			if (idx !== -1) {
				const state = msg.toUpperCase() === 'ON';
				appState.relays[idx] = state;
				if (optimisticTimers[idx]) {
					clearTimeout(optimisticTimers[idx]);
					optimisticTimers[idx] = null;
				}
			}
		}
	});

	mqttClient.on('offline', () => {
		appState.status = 'OFFLINE';
	});

	mqttClient.on('error', (err) => {
		appState.error = err.message;
	});
}

export function destroyConnection() {
	if (mqttClient) {
		mqttClient.end(true);
		mqttClient = null;
	}
}

function resetLiveTelemetry() {
	appState.v_actual = 0;
	appState.current = 0;
	appState.power = 0;
	appState.soc = 0;
	appState.runtime = '--';
	appState.relays = [false, false, false, false];
	appState.overCurrentAlarm = false;
	appState.lowBatteryAlarm = false;
}

// ─── Optimistic Relay Toggling ────────────────────────────────────────────────
/**
 * @param {number} index  0..3
 * @param {boolean} targetState
 */
export function toggleRelay(index, targetState) {
	if (index < 0 || index >= 4) return;
	const originalState = appState.relays[index];

	// Optimistic UI update immediately
	appState.relays[index] = targetState;

	// Set 3-second safety revert timer if not confirmed
	if (optimisticTimers[index]) clearTimeout(optimisticTimers[index]);
	optimisticTimers[index] = setTimeout(() => {
		console.warn(`[Relay] Relay ${index + 1} toggle unconfirmed after 3s. Reverting.`);
		appState.relays[index] = originalState;
		optimisticTimers[index] = null;
	}, 3000);

	// Dispatch command via MQTT
	if (mqttClient?.connected) {
		mqttClient.publish(TOPIC_RELAY_CMD[index], targetState ? 'ON' : 'OFF', { qos: 1 });
	}
}

// ─── Settings Configuration Update ────────────────────────────────────────────
export function saveSystemConfig(cfg) {
	Object.assign(appState.config, cfg);
	return true;
}

export function clearAlarms() {
	appState.overCurrentAlarm = false;
	appState.alarmMessage = '';
	appState.lowBatteryAlarm = false;
	appState.lowBatteryMessage = '';
}
