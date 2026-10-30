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
export const TOPIC_RELAY_STATUS = 'voltas/relay/status';
export const TOPIC_DEVICE_STATUS = 'voltas/status'; // "online" / "offline" (LWT)

// ─── Reactive state (Svelte 5 runes — $state) ────────────────────────────────
export const mqttState = $state({
	connected: false,
	connecting: false,
	error: /** @type {string|null} */ (null),

	voltage: '--',
	current: '--',
	power: '--',

	/** @type {boolean[]} */
	relays: [false, false, false, false],

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
			TOPIC_RELAY_STATUS,
			TOPIC_DEVICE_STATUS,
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
		mqttState.relays = [false, false, false, false];
	});

	client.on('offline', () => {
		mqttState.connected = false;
		mqttState.connecting = false;
		mqttState.deviceStatus = 'unknown';
		mqttState.voltage = '--';
		mqttState.current = '--';
		mqttState.power = '--';
		mqttState.relays = [false, false, false, false];
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
				mqttState.relays = [false, false, false, false];
			}
			return;
		}

		// Only accept sensor data and relay echoes if ESP32 is online
		if (mqttState.deviceStatus !== 'online') {
			return;
		}

		if (topic === TOPIC_VOLTAGE) {
			mqttState.voltage = parseFloat(msg).toFixed(2);
		} else if (topic === TOPIC_CURRENT) {
			mqttState.current = parseFloat(msg).toFixed(2);
		} else if (topic === TOPIC_POWER) {
			mqttState.power = parseFloat(msg).toFixed(2);
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
	mqttState.relays = [false, false, false, false];
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

