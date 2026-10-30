/**
 * connection.svelte.js
 * Senior IoT Full-Stack Connectivity Engine (Svelte 5 Runes)
 *
 * Implements Dual Connectivity:
 * 1. Local Direct HTTP Mode (http://voltas.local/api/data)
 * 2. Cloud Remote MQTT Mode (wss://broker.emqx.io:8084/mqtt)
 * 3. Auto Mode (Attempts Local HTTP with seamless automatic fallback to MQTT)
 */

import mqtt from 'mqtt';

// ─── Default Configuration Constants ──────────────────────────────────────────
export const DEFAULT_LOCAL_HOST = 'http://voltas.local';
export const MQTT_BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
export const MQTT_CLIENT_ID = `svelte-voltas-dashboard-${Math.random().toString(16).slice(2, 8)}`;

// Battery spec (12V 14Ah)
export const BATTERY_CAPACITY_AH = 14.0;
export const BATTERY_NOMINAL_V = 12.0;
export const BATTERY_FULL_V = 12.70;
export const BATTERY_CUTOFF_V = 10.50;
export const BATTERY_CRITICAL_V = 11.20;
export const OVER_CURRENT_THRESHOLD = 3.50; // Amperes

// MQTT Topics
export const TOPIC_VOLTAGE = 'voltas/sensors/voltage';
export const TOPIC_CURRENT = 'voltas/sensors/current';
export const TOPIC_POWER = 'voltas/sensors/power';
export const TOPIC_RELAY_STATUS = 'voltas/relay/status';
export const TOPIC_DEVICE_STATUS = 'voltas/status'; // LWT topic
export const TOPIC_RELAY_CMD = ['voltas/relay/1', 'voltas/relay/2', 'voltas/relay/3', 'voltas/relay/4'];
export const TOPIC_ALARM = 'voltas/alarm/overcurrent';

/**
 * Calculates battery State of Charge (% SoC)
 */
export function calculateSoC(voltage, current = 0) {
	if (isNaN(voltage) || voltage <= 0) return 0;
	// Compensate for load sag with ~0.08 ohm internal resistance
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
	const effectiveI = Math.pow(current, 1.05); // Peukert adjusted
	const hours = remainingAh / effectiveI;
	if (hours > 99) return '> 99h';
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// ─── Reactive State (Svelte 5 Runes) ──────────────────────────────────────────
export const appState = $state({
	// Connectivity mode: 'AUTO' | 'LOCAL_HTTP' | 'CLOUD_MQTT'
	mode: 'AUTO',
	// Active operational transport: 'LOCAL_HTTP' | 'CLOUD_MQTT' | 'NONE'
	activeTransport: 'NONE',
	// Device status: 'ONLINE' | 'OFFLINE' | 'CONNECTING'
	status: 'CONNECTING',
	localHost: DEFAULT_LOCAL_HOST,
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

	// Settings configuration loaded or pending
	config: {
		v_bat: 12.60,
		r_int: 0.08,
		r_low: 1, // 1: Active LOW, 0: Active HIGH
		i_r1: 1.0,
		i_r2: 2.5,
		i_r3: 0.5,
		i_r4: 0.8
	}
});

// ─── Internal References ──────────────────────────────────────────────────────
/** @type {import('mqtt').MqttClient|null} */
let mqttClient = null;
/** @type {number|null} */
let httpPollInterval = null;
let consecutiveHttpFails = 0;
/** @type {Array<number|null>} */
const optimisticTimers = [null, null, null, null];

// ─── History Push Helper ──────────────────────────────────────────────────────
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
	// Keep maximum 60 seconds of history
	if (appState.history.length > 60) {
		appState.history.shift();
	}
}

// ─── Telemetry Ingestion & Protection Checks ──────────────────────────────────
function processTelemetry(vActual, current, power, vNominal = null, relays = null) {
	appState.status = 'ONLINE';
	appState.lastSeen = new Date().toLocaleTimeString();
	appState.v_actual = vActual;
	appState.current = current;
	appState.power = power;
	if (vNominal !== null) appState.v_nominal = vNominal;

	// Calculate SoC & remaining run time
	appState.soc = calculateSoC(vActual, current);
	appState.runtime = calculateRuntime(vActual, current);

	// Update relays if provided
	if (relays && Array.isArray(relays)) {
		for (let i = 0; i < 4; i++) {
			appState.relays[i] = relays[i];
		}
	}

	// Record to rolling chart buffer
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

	// Load shedding: Priority order of highest loads: Relay 2 (2.5A) first, then 1, 4, 3
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
		appState.alarmMessage = `OVER-CURRENT SHEDDING: ${c.toFixed(2)}A exceeded ${OVER_CURRENT_THRESHOLD}A limit. High load Relay ${shedIndex + 1} automatically switched OFF.`;
	} else {
		appState.alarmMessage = `OVER-CURRENT ALERT: Total current (${c.toFixed(2)}A) exceeds safe limit (${OVER_CURRENT_THRESHOLD}A).`;
	}
}

// ─── Local HTTP Polling ───────────────────────────────────────────────────────
async function pollLocalHttp() {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 1800);

		const url = `${appState.localHost.replace(/\/$/, '')}/api/data`;
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(timeoutId);

		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();

		consecutiveHttpFails = 0;
		appState.activeTransport = 'LOCAL_HTTP';
		appState.error = null;

		const relays = [
			data.r1 === 'ON',
			data.r2 === 'ON',
			data.r3 === 'ON',
			data.r4 === 'ON'
		];

		processTelemetry(
			Number(data.v_actual) || 0,
			Number(data.current) || 0,
			Number(data.power) || 0,
			Number(data.v_nominal) || 12.60,
			relays
		);
	} catch (err) {
		consecutiveHttpFails++;
		// If 3 consecutive HTTP poll requests fail
		if (consecutiveHttpFails >= 3) {
			if (appState.mode === 'AUTO') {
				// Seamless fallback to Cloud MQTT
				if (appState.activeTransport !== 'CLOUD_MQTT') {
					console.warn('[DualConnect] Local HTTP unavailable, falling back to Cloud MQTT...');
					appState.activeTransport = 'CLOUD_MQTT';
					startMqtt();
				}
			} else if (appState.mode === 'LOCAL_HTTP') {
				appState.status = 'OFFLINE';
				appState.error = 'Cannot connect to ESP32 via Local HTTP';
			}
		}
	}
}

// ─── Cloud MQTT Management ────────────────────────────────────────────────────
function startMqtt() {
	if (mqttClient) return;

	appState.status = 'CONNECTING';
	mqttClient = mqtt.connect(MQTT_BROKER_URL, {
		clientId: MQTT_CLIENT_ID,
		clean: true,
		keepalive: 60,
		reconnectPeriod: 4000,
		connectTimeout: 10_000
	});

	mqttClient.on('connect', () => {
		if (appState.activeTransport === 'CLOUD_MQTT' || appState.mode === 'CLOUD_MQTT') {
			appState.status = 'ONLINE';
		}
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
			if (!isOnline && appState.activeTransport === 'CLOUD_MQTT') {
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
					// Clear optimistic timeout if confirmed
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
				// plain text
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
		if (appState.activeTransport === 'CLOUD_MQTT') {
			appState.status = 'OFFLINE';
		}
	});

	mqttClient.on('error', (err) => {
		appState.error = err.message;
	});
}

function stopMqtt() {
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

// ─── Mode Switching Logic ─────────────────────────────────────────────────────
export function setConnectivityMode(newMode) {
	appState.mode = newMode;
	consecutiveHttpFails = 0;

	if (newMode === 'LOCAL_HTTP') {
		stopMqtt();
		appState.activeTransport = 'LOCAL_HTTP';
		startHttpPolling();
	} else if (newMode === 'CLOUD_MQTT') {
		stopHttpPolling();
		appState.activeTransport = 'CLOUD_MQTT';
		startMqtt();
	} else {
		// AUTO
		appState.activeTransport = 'LOCAL_HTTP';
		startHttpPolling();
		// Pre-connect MQTT in background so fallback is instantaneous
		startMqtt();
	}
}

export function setLocalHost(host) {
	let formatted = host.trim();
	if (!/^https?:\/\//i.test(formatted)) {
		formatted = `http://${formatted}`;
	}
	appState.localHost = formatted;
	consecutiveHttpFails = 0;
}

function startHttpPolling() {
	if (httpPollInterval) clearInterval(httpPollInterval);
	pollLocalHttp();
	httpPollInterval = setInterval(pollLocalHttp, 1000);
}

function stopHttpPolling() {
	if (httpPollInterval) {
		clearInterval(httpPollInterval);
		httpPollInterval = null;
	}
}

// ─── Optimistic Relay Toggling ────────────────────────────────────────────────
/**
 * @param {number} index  0..3
 * @param {boolean} targetState
 */
export async function toggleRelay(index, targetState) {
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

	// Dispatch command via active transport
	if (appState.activeTransport === 'LOCAL_HTTP') {
		try {
			const url = `${appState.localHost.replace(/\/$/, '')}/toggle?id=${index}&state=${targetState ? 1 : 0}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			// confirmed
			if (optimisticTimers[index]) {
				clearTimeout(optimisticTimers[index]);
				optimisticTimers[index] = null;
			}
		} catch (err) {
			// Fallback: if in AUTO mode and HTTP toggle fails, try MQTT
			if (appState.mode === 'AUTO' && mqttClient?.connected) {
				mqttClient.publish(TOPIC_RELAY_CMD[index], targetState ? 'ON' : 'OFF', { qos: 1 });
			}
		}
	} else if (appState.activeTransport === 'CLOUD_MQTT' || mqttClient?.connected) {
		mqttClient.publish(TOPIC_RELAY_CMD[index], targetState ? 'ON' : 'OFF', { qos: 1 });
	}
}

// ─── Config Submission (POST /config) ─────────────────────────────────────────
export async function saveSystemConfig(cfg) {
	Object.assign(appState.config, cfg);

	const body = new URLSearchParams({
		r_low: String(cfg.r_low ?? 1),
		v_bat: Number(cfg.v_bat ?? 12.60).toFixed(2),
		r_int: Number(cfg.r_int ?? 0.08).toFixed(3),
		i_r1: Number(cfg.i_r1 ?? 1.0).toFixed(2),
		i_r2: Number(cfg.i_r2 ?? 2.5).toFixed(2),
		i_r3: Number(cfg.i_r3 ?? 0.5).toFixed(2),
		i_r4: Number(cfg.i_r4 ?? 0.8).toFixed(2)
	});

	try {
		const url = `${appState.localHost.replace(/\/$/, '')}/config`;
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString()
		});
		return res.ok;
	} catch (err) {
		console.warn('[Config] Direct HTTP config post failed:', err);
		return false;
	}
}

// ─── Lifecycle Initialization ─────────────────────────────────────────────────
export function initConnection() {
	setConnectivityMode(appState.mode);
}

export function destroyConnection() {
	stopHttpPolling();
	stopMqtt();
}

export function clearAlarms() {
	appState.overCurrentAlarm = false;
	appState.alarmMessage = '';
	appState.lowBatteryAlarm = false;
	appState.lowBatteryMessage = '';
}

