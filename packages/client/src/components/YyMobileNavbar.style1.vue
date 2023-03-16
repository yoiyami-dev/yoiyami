<template>
<div class="fsaugher">
	<div class="buttons">
		<div class="tabs_area">
			<button class="button nav _button" @click="$emit('drawer-menu-showing-change')"><i class="fas fa-bars"></i><span v-if="menuIndicated" class="indicator navbar"><i class="fas fa-circle"></i></span></button>
			<button class="button home _button" @click="mainRouter.currentRoute.value.name === 'index' ? top() : mainRouter.push('/')"><i class="fas fa-home"></i></button>
			<button class="button notifications _button" @click="mainRouter.push('/my/notifications')"><i class="fas fa-bell"></i><span v-if="$i?.hasUnreadNotification" class="indicator navbar"><i class="fas fa-circle"></i></span></button>
			<button v-if="$store.state.navBarChatIcon" class="button messaging _button" @click="mainRouter.push('/my/messaging')"><i class="fas fa-comments"></i><span v-if="$i?.hasUnreadMessagingMessage" class="indicator navbar"><i class="fas fa-circle"></i></span></button>
			<button v-if="$store.state.navBarWidgetIcon" class="button widget _button" @click="$emit('widgets-showing-change')"><i class="fas fa-layer-group"></i></button>
			<button v-if="$store.state.navBarReloadIcon" class="button reload _button" @click="reloadPage()"><i class="fas fa-redo"></i><span v-if="hasDisconnected" class="indicator navbar"><i class="fas fa-circle"></i></span></button>
		</div>
		<div class="post_area">
			<div class="post_button">
				<!-- <button class="button post _button" @click="os.post()"><i class="fas fa-pencil-alt"></i></button> -->
				<button class="button post _button" data-cy-open-post-form @click="os.post">
					<i class="icon fas fa-pencil-alt fa-fw"></i>
				</button>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import * as os from '@/os';
import { navbarItemDef } from '@/navbar';
import { $i } from '@/account';
import { mainRouter } from '@/router';
import { stream } from '@/stream';

const menuIndicated = computed(() => {
	for (const def in navbarItemDef) {
		if (def === 'notifications') continue; // 通知は下にボタンとして表示されてるから
		if (navbarItemDef[def].indicated) return true;
	}
	return false;
});

function reloadPage(): void {
	window.location.reload();
}

const hasDisconnected = ref(false);

stream.on('_disconnected_', async () => {
	hasDisconnected.value = true;
});

</script>
<style lang="scss">
.fsaugher {
	>.buttons {
			position: fixed;
			z-index: 1000;
			bottom: 0;
			left: 0;
			padding: 4px 4px calc(env(safe-area-inset-bottom, 0px) + 4px) 4px;
			display: flex;
			width: 100%;
			box-sizing: border-box;
			-webkit-backdrop-filter: var(--blur, blur(32px));
			backdrop-filter: var(--blur, blur(32px));
			background-color: var(--header);
			border-top: solid 0.5px var(--divider);
	
			> .tabs_area {
				width: 85%;
				display: flex;
				justify-content: space-around;
				padding-right: 12px;
			}
	
			> .post_area {
				width: 15%;
				padding-right: 16px;
				margin-bottom: env(safe-area-inset-bottom);
			
				> .post_button {
					width: 64px;
					background: linear-gradient(90deg,var(--buttonGradateA),var(--buttonGradateB));
					border-radius: 999px;
					height: 64px;
					position: absolute;
					bottom: calc( env(safe-area-inset-bottom) + 12px);
				}
			}
			.fa-pencil-alt {
				margin-left: 12px;
				margin-right: 12px;
			}
	
			.button.post {
				height: 100%;
				color: var(--bg);
				width: 100%;
				text-align: center;
			}
	
			.button {
				&.nav {
					padding: 12px;
					font-size: 1.2em;
				}
				&.home {
					padding: 12px;
					font-size: 1.2em;
				}
				&.notifications {
					padding: 12px;
					font-size: 1.2em;
				}
				&.messaging {
					padding: 12px;
					font-size: 1.2em;
				}
				&.widget {
					padding: 12px;
					font-size: 1.2em;
				}
				&.reload {
					padding: 12px;
					font-size: 1.2em;
				}
			}
	
			.indicator {
				&.navbar {
					font-size: 8px;
					position: relative;
					bottom: 40%;
				}
			}
	
			> .button {
				position: relative;
				flex: 1;
				padding: 0;
				margin: auto;
				height: 48px;
				border-radius: 8px;
				background: var(--panel);
				color: var(--fg);
	
				&:not(:last-child) {
					margin-right: 12px;
				}
	
				@media (max-width: 400px) {
					height: 60px;
	
					&:not(:last-child) {
						margin-right: 8px;
					}
				}
	
				&:hover {
					background: var(--X2);
				}
	
				> .indicator {
					position: absolute;
					top: 0;
					left: 0;
					color: var(--indicator);
					font-size: 16px;
					animation: blink 1s infinite;
				}
	
				&:first-child {
					margin-left: 0;
				}
	
				&:last-child {
					margin-right: 0;
				}
	
				> * {
					font-size: 20px;
				}
	
				&:disabled {
					cursor: default;
	
					> * {
						opacity: 0.5;
					}
				}
			}
		}
}
</style>
