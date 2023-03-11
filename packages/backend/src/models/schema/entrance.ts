export const packed = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			optional: false, nullable: false,
			format: 'id',
			example: 'xxxxxxxxxx',
		},
		name : {
			type: 'string',
			optional: false, nullable: false,
			example: 'xxxxxxxxxx',
		},
		backgroundUrl : {
			type: 'string',
			optional: false, nullable: false,
			example: 'xxxxxxxxxx',
		},
		registerWindowMarginRight : {
			type: 'string',
			optional: false, nullable: false,
			example: 'xxxxxxxxxx',
		},
		registerWindowMarginBottom : {
			type: 'string',
			optional: false, nullable: false,
			example: 'xxxxxxxxxx',
		},
		registerWindowMarginLeft : {
			type: 'string',
			optional: false, nullable: false,
			example: 'xxxxxxxxxx',
		},
		registerWindowMarginTop : {
			type: 'string',
			optional: false, nullable: false,
			example: 'xxxxxxxxxx',
		},
		registerWindowType : {
			type: 'integer',
			optional: false, nullable: false,
			example: 'xxxxxxxxxx',
		},
	},
} as const;
