<template>
	<FormSwitch v-model="streamModeEnabled" class="_formBlock">配信モード(Beta)</FormSwitch>
</template>
<script lang="ts" setup>
	import { computed } from 'vue';
	import { defaultStore } from '@/store';
	import FormSwitch from '@/components/form/switch.vue';
	import { GetFormResultType } from '@/scripts/form';
	import { useWidgetPropsManager, Widget, WidgetComponentExpose } from './widget';

	const streamModeEnabled = computed(defaultStore.makeGetterSetter('streamModeEnabled'));

	const name = 'streamMode';

	const widgetPropsDef = {
	};

	type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

	// 現時点ではvueの制限によりimportしたtypeをジェネリックに渡せない
	//const props = defineProps<WidgetComponentProps<WidgetProps>>();
	//const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();
	const props = defineProps<{ widget?: Widget<WidgetProps>; }>();
	const emit = defineEmits<{ (ev: 'updateProps', props: WidgetProps); }>();

	const { configure } = useWidgetPropsManager(name,
		widgetPropsDef,
		props,
		emit,
	);

	defineExpose<WidgetComponentExpose>({
		name,
		configure,
		id: props.widget ? props.widget.id : null,
	});

	//TODO: ちゃんとi18n対応しやがれ(@自分)
	//TODO: 自動でリロードするようにするべきかも
</script>
