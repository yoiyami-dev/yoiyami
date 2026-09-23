export class I18n<T extends Record<string, any>> {
	public locale: T;

	constructor(locale: T) {
		this.locale = locale;

		//#region BIND
		this.t = this.t.bind(this);
		//#endregion
	}

	// string にしているのは、ドット区切りでのパス指定を許可するため
	// なるべくこのメソッド使うよりもlocale直接参照の方がvueのキャッシュ効いてパフォーマンスが良いかも
	public t(key: string, args?: Record<string, any>): string {
		try {
			const value = key.split('.').reduce<unknown>((o, i) => {
				if (typeof o !== 'object' || o === null || !(i in o)) throw new Error('missing localization');
				return (o as Record<string, unknown>)[i];
			}, this.locale);
			if (typeof value !== 'string') throw new Error('localization value is not a string');
			let str = value;

			if (args) {
				for (const [k, v] of Object.entries(args)) {
					str = str.replace(`{${k}}`, v);
				}
			}
			return str;
		} catch (e) {
			console.warn(`missing localization '${key}'`);
			return key;
		}
	}
}
