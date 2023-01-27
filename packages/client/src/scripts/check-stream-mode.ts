
export function checkStreamMode(note: Record<string, any>, me: Record<string, any> | null | undefined, enabled: boolean): boolean {
	// 自分自身
	// if (me && (note.userId === me.id)) return false;

	if (enabled && (note.visibility === 'followers' || note.visibility === 'specified')){
		return true;
		console.log('true');
	}
	else {
		return false;
		console.log('false');
	}


}
