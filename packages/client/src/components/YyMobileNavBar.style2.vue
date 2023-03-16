<template>
<div class="dfskhebr">
	<div class="buttons">
		<button class="button nav _button" @click="$emit('drawer-menu-showing-change')"><i class="fas fa-bars"></i><span v-if="menuIndicated" class="indicator"><i class="fas fa-circle"></i></span></button>
		<button class="button home _button" @click="mainRouter.currentRoute.value.name === 'index' ? $emit('move-to-top') : mainRouter.push('/')"><i class="fas fa-home"></i></button>
		<button class="button notifications _button" @click="mainRouter.push('/my/notifications')"><i class="fas fa-bell"></i><span v-if="$i?.hasUnreadNotification" class="indicator"><i class="fas fa-circle"></i></span></button>
		<button class="button widget _button" @click="$emit('widgets-showing-change')"><i class="fas fa-layer-group"></i></button>
		<button class="button post _button" @click="os.post()"><i class="fas fa-pencil-alt"></i></button>
	</div>
</div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import * as os from '@/os';
import { navbarItemDef } from '@/navbar';
import { $i } from '@/account';
import { mainRouter } from '@/router';

const menuIndicated = computed(() => {
	for (const def in navbarItemDef) {
		if (def === 'notifications') continue; // 通知は下にボタンとして表示されてるから
		if (navbarItemDef[def].indicated) return true;
	}
	return false;
});
</script>
<style lang="scss">
.dfskhebr {
	> .buttons {
			position: fixed;
			z-index: 1000;
			bottom: 0;
			left: 0;
			padding: 16px 16px calc(env(safe-area-inset-bottom, 0px) + 16px) 16px;
			display: flex;
			width: 100%;
			box-sizing: border-box;
			-webkit-backdrop-filter: var(--blur, blur(32px));
			backdrop-filter: var(--blur, blur(32px));
			background-color: var(--header);
			border-top: solid 0.5px var(--divider);
			> .button {
				position: relative;
				flex: 1;
				padding: 0;
				margin: auto;
				height: 64px;
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
