<template>
	<div class="_formRoot">
		<FormInfo class="_formBlock">以下の機能はすべてベータ版です。</FormInfo>

		<FormSwitch v-model="navBarChatIcon" class="_formBlock">チャットを表示する</FormSwitch>
		<FormSwitch v-model="navBarReloadIcon" class="_formBlock">リロードを表示する</FormSwitch>
		<FormSwitch v-model="navBarWidgetIcon" class="_formBlock">ウィジェットを表示する</FormSwitch>
		<FormSwitch v-model="newVideoPlayerEnabled" class="_formBlock">新しいビデオプレイヤー(vue-plyr)を使用する</FormSwitch>
		<FormSwitch v-model="postFormEmojiPickerNewStyleEnabled" class="_formBlock">投稿画面で新しい絵文字ピッカーを使用する</FormSwitch>
		<FormSwitch v-model="postFormFooterEmojiIconEnabled" class="_formBlock">投稿画面のフッターに絵文字ボタンを表示する</FormSwitch>
		<FormSwitch v-model="hideReaction" class="_formBlock">リアクションを非表示にする</FormSwitch>
		<FormSwitch v-model="showReactionsCount" class="_formBlock">リアクションの数を表示する<template #caption>現時点ではリアルタイムに変更されません</template></FormSwitch>

	</div>
</template>
	
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { defaultStore } from '@/store';
	import FormInfo from '@/components/MkInfo.vue';
	import FormSwitch from '@/components/form/switch.vue';

	const navBarChatIcon = computed(defaultStore.makeGetterSetter('navBarChatIcon'));
	const navBarReloadIcon = computed(defaultStore.makeGetterSetter('navBarReloadIcon'));
	const navBarWidgetIcon = computed(defaultStore.makeGetterSetter('navBarWidgetIcon'));
	const newVideoPlayerEnabled = computed(defaultStore.makeGetterSetter('newVideoPlayerEnabled'));
	const postFormEmojiPickerNewStyleEnabled = computed(defaultStore.makeGetterSetter('postFormEmojiPickerNewStyleEnabled'));
	const postFormFooterEmojiIconEnabled = computed(defaultStore.makeGetterSetter('postFormFooterEmojiIconEnabled'));
	const hideReaction = computed(defaultStore.makeGetterSetter('hideReactions'));
	const showReactionsCount = computed(defaultStore.makeGetterSetter('showReactionsCount'));
</script>
