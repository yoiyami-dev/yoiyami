<template>
<div class="_formRoot">
	<FormSection>
		<template #label>{{ i18n.ts.header }}</template>
		<FormSwitch v-model="postFormHeaderPostButtonEnabled" class="_formBlock">{{ i18n.ts.showPostFormHeaderPostButton }}</FormSwitch>
	</FormSection>

	<FormSection>
		<template #label>{{ i18n.ts.footer }}</template>
		<FormSwitch v-model="postFormFooterPostButtonEnabled" class="_formBlock">{{ i18n.ts.showPostFormFooterPostButton }}</FormSwitch>
		<FormSwitch v-model="postFormFooterEmojiIconEnabled" class="_formBlock">{{ i18n.ts.showPostFormFooterEmojiButton }}</FormSwitch>
	</FormSection>

	<FormSection>
		<template #label>{{ i18n.ts.emojiPicker }}</template>
		<FormSwitch v-model="postFormEmojiPickerNewStyleEnabled">{{ i18n.ts.useNewStyleEmojiPicker }}</FormSwitch>
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
import { definePageMetadata } from '@/scripts/page-metadata';

const postFormEmojiPickerNewStyleEnabled = computed(defaultStore.makeGetterSetter('postFormEmojiPickerNewStyleEnabled'));
const postFormHeaderPostButtonEnabled = computed(defaultStore.makeGetterSetter('postFormHeaderPostButtonEnabled'));
const postFormFooterPostButtonEnabled = computed(defaultStore.makeGetterSetter('postFormFooterPostButtonEnabled'));
const postFormFooterEmojiIconEnabled = computed(defaultStore.makeGetterSetter('postFormFooterEmojiIconEnabled'));

definePageMetadata({
	title: i18n.ts.postForm,
	icon: 'fas fa-pencil-alt',
});
</script>
<style lang="scss" scoped>

</style>
