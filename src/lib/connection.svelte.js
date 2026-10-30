/**
 * connection.svelte.js
 * Core MQTT Telemetry & Direct Relay Control Engine
 */

import mqtt from 'mqtt';

// ─── Broker Configuration ─────────────────────────────────────────────────────
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const CLIENT_ID = `voltas-core-${Math.random().toString(16).slice(2, 8)}`;

// 12V 14Ah Battery Spec
export const BATTERY_CAPACITY_AH = 14.0;
export const BATTERY_CUTOFF_V = 10.50;
export const BATTERY_FULL_V = 12.70;

// MQTT Topics
const TOPIC_VOLTAGE = 'voltas/sensors/voltage';
const TOPIC_CURRENT = 'voltas/sensors/current';
const TOPIC_POWER = 'voltas/sensors/power';
const TOPIC_TEMPERATURE = 'voltas/sensors/temperature';
const TOPIC_RELAY_STATUS = 'voltas/relay/status';
const TOPIC_DEVICE_STATUS = 'voltas/status'; // LWT topic
export const TOPIC_SET_CURRENT_LIMIT = 'voltas/config/high_current_limit';
const TOPIC_RELAY_CMD = [
	'voltas/relay/1',
	'voltas/relay/2',
	'voltas/relay/3',
	'voltas/relay/4'
];

/**
 * Calculates human-readable remaining run time for 12V 14Ah battery
 */
export function calculateRuntime(voltage, current) {
	if (isNaN(current) || current <= 0.05) return 'Idle (No load)';
	if (isNaN(voltage) || voltage <= BATTERY_CUTOFF_V) return '< 5 min';

	// Open-circuit voltage compensation for voltage sag (0.08 ohm internal R)
	const voc = voltage + (current * 0.08);
	const soc = Math.max(0.05, Math.min(1.0, (voc - BATTERY_CUTOFF_V) / (BATTERY_FULL_V - BATTERY_CUTOFF_V)));
	const remainingAh = BATTERY_CAPACITY_AH * soc;
	const hours = remainingAh / current;

	if (hours > 99) return '> 99h';
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// ─── Reactive State (Svelte 5 Runes) ──────────────────────────────────────────
export const appState = $state({
	// Device status: 'ONLINE' | 'OFFLINE' | 'CONNECTING'
	status: 'CONNECTING',
	lastSeen: /** @type {string|null} */ (null),

	// Live Telemetry
	voltage: '--',
	current: '--',
	power: '--',
	temperature: '--',
	runtime: '--',

	// Overcurrent Protection Limit (Amperes)
	currentLimit: 3.5,

	// Relays [0..3]
	relays: [false, false, false, false]
});

// ─── MQTT Client Instance ─────────────────────────────────────────────────────
/** @type {import('mqtt').MqttClient|null} */
let mqttClient = null;

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

		// Subscribe to strictly contract topics and configuration topics
		const topics = [
			TOPIC_VOLTAGE,
			TOPIC_CURRENT,
			TOPIC_POWER,
			TOPIC_TEMPERATURE,
			TOPIC_RELAY_STATUS,
			TOPIC_DEVICE_STATUS,
			TOPIC_SET_CURRENT_LIMIT
		];
		mqttClient?.subscribe(topics, { qos: 1 });
	});

	mqttClient.on('message', (topic, payload) => {
		const msg = payload.toString().trim();
		appState.lastSeen = new Date().toLocaleTimeString();

		// Device Online / Offline Heartbeat (LWT)
		if (topic === TOPIC_DEVICE_STATUS) {
			const isOnline = msg.toLowerCase() === 'online';
			appState.status = isOnline ? 'ONLINE' : 'OFFLINE';
			if (!isOnline) {
				resetTelemetry();
			}
			return;
		}

		// Reject stale/retained telemetry when device is OFFLINE
		if (appState.status !== 'ONLINE') {
			return;
		}

		if (topic === TOPIC_VOLTAGE) {
			const v = parseFloat(msg);
			if (!isNaN(v)) {
				appState.voltage = v.toFixed(2);
				updateRuntime();
			}
		} else if (topic === TOPIC_CURRENT) {
			const c = parseFloat(msg);
			if (!isNaN(c)) {
				appState.current = c.toFixed(2);
				updateRuntime();
			}
		} else if (topic === TOPIC_POWER) {
			const p = parseFloat(msg);
			if (!isNaN(p)) {
				appState.power = p.toFixed(2);
			}
		} else if (topic === TOPIC_TEMPERATURE) {
			const t = parseFloat(msg);
			if (!isNaN(t)) {
				appState.temperature = t.toFixed(1);
			}
		} else if (topic === TOPIC_SET_CURRENT_LIMIT) {
			const limit = parseFloat(msg);
			if (!isNaN(limit) && limit > 0) {
				appState.currentLimit = parseFloat(limit.toFixed(2));
			}
		} else if (topic === TOPIC_RELAY_STATUS) {
			try {
				const d = JSON.parse(msg);
				for (let i = 0; i < 4; i++) {
					appState.relays[i] = d[`relay${i + 1}`] === 'ON';
				}
			} catch {
				// Ignore malformed JSON
			}
		}
	});

	mqttClient.on('offline', () => {
		appState.status = 'OFFLINE';
		resetTelemetry();
	});

	mqttClient.on('close', () => {
		appState.status = 'OFFLINE';
	});

	mqttClient.on('error', () => {
		appState.status = 'OFFLINE';
	});
}

function updateRuntime() {
	const v = parseFloat(appState.voltage);
	const c = parseFloat(appState.current);
	if (!isNaN(v) && !isNaN(c)) {
		appState.runtime = calculateRuntime(v, c);
	}
}

function resetTelemetry() {
	appState.voltage = '--';
	appState.current = '--';
	appState.power = '--';
	appState.temperature = '--';
	appState.runtime = '--';
	appState.relays = [false, false, false, false];
}

export function destroyConnection() {
	if (mqttClient) {
		mqttClient.end(true);
		mqttClient = null;
	}
}

// ─── Direct Relay Control ─────────────────────────────────────────────────────
/**
 * Sets and publishes high current threshold limit (e.g. 3.0 or 4.5 Amperes).
 * ESP32 saves to Flash NVS storage and evaluates immediately.
 * @param {number|string} limit
 */
export function setHighCurrentLimit(limit) {
	const val = typeof limit === 'number' ? limit : parseFloat(limit);
	if (isNaN(val) || val <= 0 || appState.status !== 'ONLINE' || !mqttClient?.connected) return;

	const formatted = val.toFixed(2);
	appState.currentLimit = parseFloat(formatted);

	// Publish to ESP32: qos 1, retain true so threshold persists on broker across reconnects
	mqttClient.publish(TOPIC_SET_CURRENT_LIMIT, formatted, { qos: 1, retain: true });
}

/**
 * Toggles a relay channel directly via MQTT
 * @param {number} index  0..3
 * @param {boolean} targetState
 */
export function toggleRelay(index, targetState) {
	// Guard against invalid index or disabled/offline states
	if (index < 0 || index >= 4 || appState.status !== 'ONLINE' || !mqttClient?.connected) return;

	// Instant UI responsiveness
	appState.relays[index] = targetState;

	// Publish directly to device topic: qos 1, retain false (never retain commands)
	mqttClient.publish(TOPIC_RELAY_CMD[index], targetState ? 'ON' : 'OFF', { qos: 1, retain: false });
}
