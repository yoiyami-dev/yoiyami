import type { Response } from 'node-fetch';
import config from '@/config/index.js';
import { getResponse } from '@/misc/fetch.js';
import type { IObject } from './type.js';
import { assertActivityMatchesUrls, FetchAllowSoftFailMask } from './misc/check-against-url.js';
import { validateContentTypeSetAsActivityPub } from './misc/validator.js';
import { activityPubAccept } from './accept.js';

export async function parseActivityResponse(
	requestUrl: string,
	response: Response,
	allowSoftfail: FetchAllowSoftFailMask = FetchAllowSoftFailMask.Strict,
): Promise<IObject> {
	validateContentTypeSetAsActivityPub(response);
	const activity = await response.json() as IObject;
	assertActivityMatchesUrls(requestUrl, activity, [response.url], allowSoftfail);
	return activity;
}

export async function getActivityJson(
	url: string,
	allowSoftfail: FetchAllowSoftFailMask = FetchAllowSoftFailMask.Strict,
): Promise<IObject> {
	const response = await getResponse({
		url,
		method: 'GET',
		headers: { 'User-Agent': config.userAgent, Accept: activityPubAccept },
	});
	return await parseActivityResponse(url, response, allowSoftfail);
}
