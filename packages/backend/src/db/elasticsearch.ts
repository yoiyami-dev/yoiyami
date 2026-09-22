import * as elasticsearch from '@elastic/elasticsearch';
import config from '@/config/index.js';

const index = {
	settings: {
		analysis: {
			analyzer: {
				ngram: {
					tokenizer: 'ngram',
				},
			},
		},
	},
	mappings: {
		properties: {
			text: {
				type: 'text',
				index: true,
				analyzer: 'ngram',
			},
			userId: {
				type: 'keyword',
				index: true,
			},
			userHost: {
				type: 'keyword',
				index: true,
			},
		},
	},
};

// Init ElasticSearch connection
const elasticsearchConfig = config.elasticsearch;
const client = elasticsearchConfig ? new elasticsearch.Client({
	node: `${elasticsearchConfig.ssl ? 'https://' : 'http://'}${elasticsearchConfig.host}:${elasticsearchConfig.port}`,
	auth: (elasticsearchConfig.user && elasticsearchConfig.pass) ? {
		username: elasticsearchConfig.user,
		password: elasticsearchConfig.pass,
	} : undefined,
	pingTimeout: 30000,
}) : null;

if (client && elasticsearchConfig) {
	client.indices.exists({
		index: elasticsearchConfig.index || 'misskey_note',
	}).then(exist => {
		if (!exist.body) {
			client.indices.create({
				index: elasticsearchConfig.index || 'misskey_note',
				body: index,
			});
		}
	});
}

export default client;
