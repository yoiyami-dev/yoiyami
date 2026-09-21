declare module '@peertube/http-signature' {
	import { ClientRequest, IncomingMessage } from 'node:http';

	namespace httpSignature {
		export interface ISignature {
			keyId: string;
			algorithm: string;
			headers: string[];
			signature: string;
		}

		export interface IOptions {
			headers?: string[];
			algorithm?: string;
			strict?: boolean;
			authorizationHeaderName?: string;
		}

		export interface IParseRequestOptions extends IOptions {
			clockSkew?: number;
		}

		export interface IParsedSignature {
			scheme: string;
			params: ISignature;
			signingString: string;
			algorithm: string;
			keyId: string;
		}

		export interface IRequestSignerConstructorOptionsFromProperties {
			keyId: string;
			key: string | Buffer;
			algorithm?: string;
		}

		export interface IRequestSignerConstructorOptionsFromFunction {
			sign?: (data: string, callback: (error: Error | null, signature: ISignature) => void) => void;
		}

		export type RequestSignerConstructorOptions =
			IRequestSignerConstructorOptionsFromProperties |
			IRequestSignerConstructorOptionsFromFunction;

		export class RequestSigner {
			constructor(options: RequestSignerConstructorOptions);
			writeHeader(header: string, value: string): string;
			writeDateHeader(): string;
			writeTarget(method: string, path: string): void;
			sign(callback: (error: Error | null, authorization: string) => void): void;
		}

		export interface ISignRequestOptions extends IOptions {
			keyId: string;
			key: string;
			httpVersion?: string;
		}

		export function parse(request: IncomingMessage, options?: IParseRequestOptions): IParsedSignature;
		export function parseRequest(request: IncomingMessage, options?: IParseRequestOptions): IParsedSignature;
		export function sign(request: ClientRequest, options: ISignRequestOptions): boolean;
		export function signRequest(request: ClientRequest, options: ISignRequestOptions): boolean;
		export function createSigner(): RequestSigner;
		export function isSigner(value: unknown): value is RequestSigner;
		export function sshKeyToPEM(key: string): string;
		export function sshKeyFingerprint(key: string): string;
		export function pemToRsaSSHKey(pem: string, comment: string): string;
		export function verify(parsedSignature: IParsedSignature, publicKey: string | Buffer): boolean;
		export function verifySignature(parsedSignature: IParsedSignature, publicKey: string | Buffer): boolean;
		export function verifyHMAC(parsedSignature: IParsedSignature, secret: string): boolean;
	}

	export = httpSignature;
}
