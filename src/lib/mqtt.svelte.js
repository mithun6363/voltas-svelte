/**
 * mqtt.svelte.js
 * Reactive MQTT store using Svelte 5 runes + mqtt.js (WebSocket transport).
 *
 * broker.emqx.io exposes its MQTT-over-WebSocket endpoint on port 8083 (ws://)
 * or 8084 (wss://).  Browsers cannot use raw TCP 1883 — they MUST use WS/WSS.
 */

import mqtt from 'mqtt';

// ─── Broker config ────────────────────────────────────────────────────────────
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const CLIENT_ID = `voltas-frontend-${Math.random().toString(16).slice(2, 10)}`;

// ─── Topics ──────────────────────────────────────────────────────────────────
export const TOPIC_RELAY = ['voltas/relay/1', 'voltas/relay/2', 'voltas/relay/3', 'voltas/relay/4'];
export const TOPIC_VOLTAGE = 'voltas/sensors/voltage';
export const TOPIC_CURRENT = 'voltas/sensors/current';
export const TOPIC_POWER = 'voltas/sensors/power';
export const TOPIC_RUNTIME = 'voltas/sensors/runtime';
export const TOPIC_RELAY_STATUS = 'voltas/relay/status';
export const TOPIC_DEVICE_STATUS = 'voltas/status'; // "online" / "offline" (LWT)
export const TOPIC_ALARM = 'voltas/alarm/overcurrent';

// ─── Over-current & Battery Constants (12V 14Ah Spec) ─────────────────────────
export const OVER_CURRENT_LIMIT = 3.50; // Amperes threshold
export const BATTERY_CAPACITY_AH = 14.0; // 14Ah spec
export const BATTERY_NOMINAL_V = 12.0;  // 12V nominal
export const BATTERY_FULL_V = 12.70;    // 100% full charge (resting)
export const BATTERY_CUTOFF_V = 10.50;  // 0% safe cutoff voltage
export const BATTERY_CRITICAL_V = 11.20; // Low-battery alarm trigger
export const BATTERY_INTERNAL_R = 0.08; // Estimated internal resistance (Ohms)

/**
 * Calculates battery State-of-Charge (SoC %) compensated for voltage sag under load
 * @param {number} vActual
 * @param {number} current
 * @returns {number}
 */
export function computeSoC(vActual, current) {
	if (isNaN(vActual) || vActual <= 0) return 0;
	const c = isNaN(current) || current < 0 ? 0 : current;
	// Compensate for load sag: estimated open-circuit voltage
	const voc = vActual + (c * BATTERY_INTERNAL_R);
	const raw = ((voc - BATTERY_CUTOFF_V) / (BATTERY_FULL_V - BATTERY_CUTOFF_V)) * 100;
	return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Calculates human-readable battery runtime prediction based on 12V 14Ah spec
 * @param {number} vActual
 * @param {number} current
 * @returns {string}
 */
export function computeRuntime(vActual, current) {
	if (isNaN(current) || current <= 0.05) return 'Idle (No load)';
	if (isNaN(vActual) || vActual <= BATTERY_CUTOFF_V) return '< 5 min (Empty)';
	
	const soc = computeSoC(vActual, current) / 100;
	const remainingAh = BATTERY_CAPACITY_AH * Math.max(0.02, soc);
	
	// Incorporate mild Peukert effect (k = 1.05) for realistic run time under load
	const effectiveCurrent = Math.pow(current, 1.05);
	const hours = remainingAh / effectiveCurrent;
	
	if (hours > 99) return '> 99h';
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// ─── Reactive state (Svelte 5 runes — $state) ────────────────────────────────
export const mqttState = $state({
	connected: false,
	connecting: false,
	error: /** @type {string|null} */ (null),

	voltage: '--',
	current: '--',
	power: '--',
	runtime: '--',
	soc: '--',

	/** @type {boolean[]} */
	relays: [false, false, false, false],

	/** Over-current alarm state */
	overCurrentAlarm: false,
	alarmMessage: '',
	alarmTimestamp: /** @type {string|null} */ (null),

	/** Low-battery alarm state */
	lowBatteryAlarm: false,
	lowBatteryMessage: '',

	/** "online" | "offline" | "unknown" — sourced from voltas/status LWT topic */
	deviceStatus: /** @type {'online'|'offline'|'unknown'} */ ('unknown'),

	/** ISO timestamp of last message */
	lastSeen: /** @type {string|null} */ (null)
});

// ─── Internal client reference ────────────────────────────────────────────────
/** @type {import('mqtt').MqttClient|null} */
let client = null;

// ─── Connect ─────────────────────────────────────────────────────────────────
export function connectMQTT() {
	if (client) return; // already connected / connecting

	mqttState.connecting = true;
	mqttState.error = null;

	client = mqtt.connect(BROKER_URL, {
		clientId: CLIENT_ID,
		clean: true,
		keepalive: 60,
		reconnectPeriod: 4000,
		connectTimeout: 15_000
	});

	client.on('connect', () => {
		mqttState.connected = true;
		mqttState.connecting = false;
		mqttState.error = null;

		// Subscribe to all sensor + status topics
		const topics = [
			TOPIC_VOLTAGE,
			TOPIC_CURRENT,
			TOPIC_POWER,
			TOPIC_RUNTIME,
			TOPIC_RELAY_STATUS,
			TOPIC_DEVICE_STATUS,
			TOPIC_ALARM,
			...TOPIC_RELAY
		];
		client.subscribe(topics, { qos: 1 });
	});

	client.on('reconnect', () => {
		mqttState.connecting = true;
		mqttState.connected = false;
	});

	client.on('disconnect', () => {
		mqttState.connected = false;
		mqttState.deviceStatus = 'unknown';
		mqttState.voltage = '--';
		mqttState.current = '--';
		mqttState.power = '--';
		mqttState.runtime = '--';
		mqttState.soc = '--';
		mqttState.relays = [false, false, false, false];
		mqttState.overCurrentAlarm = false;
		mqttState.lowBatteryAlarm = false;
	});

	client.on('offline', () => {
		mqttState.connected = false;
		mqttState.connecting = false;
		mqttState.deviceStatus = 'unknown';
		mqttState.voltage = '--';
		mqttState.current = '--';
		mqttState.power = '--';
		mqttState.runtime = '--';
		mqttState.soc = '--';
		mqttState.relays = [false, false, false, false];
		mqttState.overCurrentAlarm = false;
		mqttState.lowBatteryAlarm = false;
	});

	client.on('error', (err) => {
		mqttState.error = err.message;
		mqttState.connecting = false;
	});

	client.on('message', (topic, payload) => {
		const msg = payload.toString().trim();
		mqttState.lastSeen = new Date().toLocaleTimeString();

		if (topic === TOPIC_DEVICE_STATUS) {
			const isOnline = msg.toLowerCase() === 'online';
			mqttState.deviceStatus = isOnline ? 'online' : 'offline';
			if (!isOnline) {
				// Reset sensor and relay states immediately when ESP32 is offline
				mqttState.voltage = '--';
				mqttState.current = '--';
				mqttState.power = '--';
				mqttState.runtime = '--';
				mqttState.relays = [false, false, false, false];
				mqttState.overCurrentAlarm = false;
			}
			return;
		}

		// Only accept sensor data, alarms, and relay echoes if ESP32 is online
		if (mqttState.deviceStatus !== 'online') {
			return;
		}

		if (topic === TOPIC_VOLTAGE) {
			mqttState.voltage = parseFloat(msg).toFixed(2);
			updateRuntimeEstimate();
		} else if (topic === TOPIC_CURRENT) {
			const c = parseFloat(msg);
			mqttState.current = c.toFixed(2);
			updateRuntimeEstimate();

			// Auto Protection: if current exceeds safe threshold, trip high load
			if (c > OVER_CURRENT_LIMIT) {
				handleOverCurrentProtection(c);
			} else if (mqttState.overCurrentAlarm && c <= OVER_CURRENT_LIMIT - 0.5) {
				// Auto-reset alarm when current returns safely below threshold
				mqttState.overCurrentAlarm = false;
			}
		} else if (topic === TOPIC_POWER) {
			mqttState.power = parseFloat(msg).toFixed(2);
		} else if (topic === TOPIC_RUNTIME) {
			mqttState.runtime = msg;
		} else if (topic === TOPIC_ALARM) {
			try {
				const data = JSON.parse(msg);
				if (data.alarm) {
					mqttState.overCurrentAlarm = true;
					mqttState.alarmMessage = data.message || 'Over-current limit exceeded!';
					mqttState.alarmTimestamp = new Date().toLocaleTimeString();
				} else {
					mqttState.overCurrentAlarm = false;
				}
			} catch {
				const isAlarm = msg.toUpperCase().includes('ALARM') || msg.toUpperCase().includes('TRIP');
				mqttState.overCurrentAlarm = isAlarm;
				if (isAlarm) {
					mqttState.alarmMessage = msg;
					mqttState.alarmTimestamp = new Date().toLocaleTimeString();
				}
			}
		} else if (topic === TOPIC_RELAY_STATUS) {
			try {
				const data = JSON.parse(msg);
				for (let i = 0; i < 4; i++) {
					mqttState.relays[i] = data[`relay${i + 1}`] === 'ON';
				}
			} catch {
				// malformed JSON — ignore
			}
		} else {
			// Individual relay command echo (e.g. voltas/relay/1)
			const idx = TOPIC_RELAY.indexOf(topic);
			if (idx !== -1) {
				mqttState.relays[idx] = msg.toUpperCase() === 'ON';
			}
		}
	});
}

function updateRuntimeEstimate() {
	const v = parseFloat(mqttState.voltage);
	const c = parseFloat(mqttState.current);
	if (!isNaN(v) && !isNaN(c)) {
		mqttState.runtime = computeRuntime(v, c);
		const socVal = computeSoC(v, c);
		mqttState.soc = `${socVal}%`;

		// Low Battery Alarm trigger (< 11.2V or < 15%)
		if (v <= BATTERY_CRITICAL_V || socVal <= 15) {
			mqttState.lowBatteryAlarm = true;
			mqttState.lowBatteryMessage = `LOW BATTERY ALERT: Battery dropped to ${socVal}% (${v.toFixed(2)}V). Critical threshold is ${BATTERY_CRITICAL_V}V!`;
		} else if (v >= BATTERY_CRITICAL_V + 0.3) {
			mqttState.lowBatteryAlarm = false;
			mqttState.lowBatteryMessage = '';
		}
	}
}

/**
 * Automatically sheds the highest current load when current exceeds limit
 * @param {number} current
 */
function handleOverCurrentProtection(current) {
	mqttState.overCurrentAlarm = true;
	mqttState.alarmTimestamp = new Date().toLocaleTimeString();

	// Priority of highest loads:
	// Relay 2 is the highest load (index 1).
	// If Relay 2 is ON, turn it OFF first. Otherwise turn off Relay 1, 4, 3.
	const priorityOrder = [1, 0, 3, 2];
	let trippedIndex = -1;

	for (const idx of priorityOrder) {
		if (mqttState.relays[idx]) {
			trippedIndex = idx;
			setRelay(idx, false);
			break;
		}
	}

	if (trippedIndex !== -1) {
		mqttState.alarmMessage = `OVER-CURRENT DETECTED (${current.toFixed(2)}A > ${OVER_CURRENT_LIMIT}A). High current load (Relay ${trippedIndex + 1}) was automatically shut OFF.`;
	} else {
		mqttState.alarmMessage = `OVER-CURRENT DETECTED (${current.toFixed(2)}A > ${OVER_CURRENT_LIMIT}A).`;
	}
}

// ─── Disconnect ───────────────────────────────────────────────────────────────
export function disconnectMQTT() {
	if (!client) return;
	client.end(true);
	client = null;
	mqttState.connected = false;
	mqttState.connecting = false;
	mqttState.deviceStatus = 'unknown';
	mqttState.voltage = '--';
	mqttState.current = '--';
	mqttState.power = '--';
	mqttState.runtime = '--';
	mqttState.soc = '--';
	mqttState.relays = [false, false, false, false];
	mqttState.overCurrentAlarm = false;
	mqttState.lowBatteryAlarm = false;
}

export function clearAlarm() {
	mqttState.overCurrentAlarm = false;
	mqttState.alarmMessage = '';
	mqttState.lowBatteryAlarm = false;
	mqttState.lowBatteryMessage = '';
}

// ─── Publish relay command ────────────────────────────────────────────────────
/**
 * @param {number} index  0-based relay index
 * @param {boolean} on    desired state
 */
export function setRelay(index, on) {
	if (!client?.connected || mqttState.deviceStatus !== 'online') return;
	client.publish(TOPIC_RELAY[index], on ? 'ON' : 'OFF', { qos: 1, retain: true });
	// Optimistic UI update
	mqttState.relays[index] = on;
}

