<template>
<component
	:is="popup.component"
	v-for="popup in popups"
	:key="popup.id"
	v-bind="popup.props"
	v-on="popup.events"
/>

<div v-if="uploads.length > 0 || postQueues.length > 0" class="sdjhfuei _acrylic">
	<XPostQueue v-if="postQueues.length > 0"/>
	<hr v-if="uploads.length > 0 && postQueues.length > 0"/>
	<XUpload v-if="uploads.length > 0"/>
</div>

<XStreamIndicator/>

<div v-if="pendingApiRequestsCount > 0" id="wait"></div>

<div v-if="dev" id="devTicker"><span>DEV BUILD</span></div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';
import { swInject } from './sw-inject';
import { popup, popups, pendingApiRequestsCount } from '@/os';
import { uploads } from '@/scripts/upload';
import { postQueues } from '@/scripts/post-queue';
import * as sound from '@/scripts/sound';
import { $i } from '@/account';
import { stream } from '@/stream';

const XStreamIndicator = defineAsyncComponent(() => import('./stream-indicator.vue'));
const XUpload = defineAsyncComponent(() => import('./upload.vue'));
const XPostQueue = defineAsyncComponent(() => import('./post-queue.vue'));

const dev = _DEV_;

const onNotification = notification => {
	if ($i.mutingNotificationTypes.includes(notification.type)) return;

	if (document.visibilityState === 'visible') {
		stream.send('readNotification', {
			id: notification.id,
		});

		popup(defineAsyncComponent(() => import('@/components/MkNotificationToast.vue')), {
			notification,
		}, {}, 'closed');
	}

	sound.play('notification');
};

if ($i) {
	const connection = stream.useChannel('main', null, 'UI');
	connection.on('notification', onNotification);

	//#region Listen message from SW
	if ('serviceWorker' in navigator) {
		swInject();
	}
}
</script>

<style lang="scss">
@keyframes dev-ticker-blink {
	0% { opacity: 1; }
	50% { opacity: 0; }
	100% { opacity: 1; }
}

@keyframes progress-spinner {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.sdjhfuei {
	position: fixed;
	right: 16px;
	width: 260px;
	top: 32px;
	padding: 16px 20px;
	pointer-events: none;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	border-radius: 8px;
}

#wait {
	display: block;
	position: fixed;
	z-index: 4000000;
	top: 15px;
	right: 15px;

	&:before {
		content: "";
		display: block;
		width: 18px;
		height: 18px;
		box-sizing: border-box;
		border: solid 2px transparent;
		border-top-color: var(--accent);
		border-left-color: var(--accent);
		border-radius: 50%;
		animation: progress-spinner 400ms linear infinite;
	}
}

#devTicker {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 2147483647;
	color: #ff0;
	background: rgba(0, 0, 0, 0.5);
	padding: 4px 5px;
	font-size: 14px;
	pointer-events: none;
	user-select: none;

	> span {
		animation: dev-ticker-blink 2s infinite;
	}
}
</style>
