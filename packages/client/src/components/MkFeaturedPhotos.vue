<template>
<div v-if="true" class="xfbouadm" :style="{ backgroundImage: 'url('+ backgroundUrl +')' }"></div>
</template>

<script lang="ts" setup>
import { Url } from 'url';
import { ref } from 'vue';
import * as Misskey from '@r-ca/yoiyami-js';
import * as os from '@/os';

let backgroundUrl = ref<Url>();

// const meta = ref<Misskey.entities.DetailedInstanceMetadata>();

// os.api('meta', { detail: true }).then(gotMeta => {
// 	meta.value = gotMeta;
// });

os.api('entrance').then(res => {
	backgroundUrl.value = res?.backgroundUrl || 'https://beta.romneko.net/files/686e036f-e2f4-4b38-a9f7-237649a3dd98';
});
</script>

<style lang="scss" scoped>
.xfbouadm {
	background-position: center;
	background-size: cover;
}
</style>
