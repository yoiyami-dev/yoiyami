<template>
	<FormSwitch v-model="streamModeEnabled" class="_formBlock">配信モード(Beta)</FormSwitch>
</template>
<script lang="ts" setup>
	import { computed, ref, watch } from 'vue';
	import { defaultStore } from '@/store';
	import FormSwitch from '@/components/form/switch.vue';

	const streamModeEnabled = computed(defaultStore.makeGetterSetter('streamModeEnabled'));

	//TODO: ちゃんとi18n対応しやがれ(@自分)
</script>
