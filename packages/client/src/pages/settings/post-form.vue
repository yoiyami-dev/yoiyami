<template>
<div class="_formRoot">
	<FormSection>
		<template #label>ヘッダー</template>
		<FormSwitch v-model="postFormHeaderPostButtonEnabled" class="_formBlock">投稿画面のヘッダーに投稿ボタンを表示する</FormSwitch>
	</FormSection>

	<FormSection>
		<template #label>フッター</template>
		<FormSwitch v-model="postFormFooterPostButtonEnabled" class="_formBlock">投稿画面のフッターに投稿ボタンを表示する</FormSwitch>
		<FormSwitch v-model="postFormFooterEmojiIconEnabled" class="_formBlock">投稿画面のフッターに絵文字ボタンを表示する</FormSwitch>
	</FormSection>

	<FormSection>
		<template #label>絵文字ピッカー</template>
		<FormSwitch v-model="postFormEmojiPickerNewStyleEnabled">新しい絵文字ピッカーを使用する</FormSwitch>
	</FormSection>
</div>
</template>
<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import { defaultStore } from '@/store';
import FormSwitch from '@/components/form/switch.vue';
import FormSection from '@/components/form/section.vue';
import * as os from '@/os';
import { i18n } from '@/i18n';

const postFormEmojiPickerNewStyleEnabled = computed(defaultStore.makeGetterSetter('postFormEmojiPickerNewStyleEnabled'));
const postFormHeaderPostButtonEnabled = computed(defaultStore.makeGetterSetter('postFormHeaderPostButtonEnabled'));
const postFormFooterPostButtonEnabled = computed(defaultStore.makeGetterSetter('postFormFooterPostButtonEnabled'));
const postFormFooterEmojiIconEnabled = computed(defaultStore.makeGetterSetter('postFormFooterEmojiIconEnabled'));

</script>
<style lang="scss" scoped>

</style>
