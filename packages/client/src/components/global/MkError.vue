<template>
<transition :name="$store.state.animation ? 'zoom' : ''" appear>
	<div class="mjndxjcg">
		<i class="fas fa-exclamation-triangle _ghost" aria-hidden="true"></i>
		<p><i class="fas fa-exclamation-triangle"></i> {{ i18n.ts.somethingHappened }}</p>
		<MkButton class="button" @click="() => $emit('retry')">{{ i18n.ts.retry }}</MkButton>
	</div>
</transition>
</template>

<script lang="ts" setup>
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n';
</script>

<style lang="scss" scoped>
.mjndxjcg {
	padding: 32px;
	text-align: center;

	> p {
		margin: 0 0 8px 0;
	}

	> .button {
		margin: 0 auto;
	}

	> ._ghost {
		display: block;
		font-size: 128px;
		line-height: 1;
		margin-bottom: 16px;
	}
}
</style>
