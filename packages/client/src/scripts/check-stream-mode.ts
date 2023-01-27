import followersVue from "@/pages/user/followers.vue";

export function checkStreamMode(note: Record<string, any>, me: Record<string, any> | null | undefined, enabled: boolean): boolean {
	// 自分自身
	if (me && (note.userId === me.id)) return false;

	if (note.visibility === 'followers') return true;
	if (note.visibility === 'specified') return true;

}
