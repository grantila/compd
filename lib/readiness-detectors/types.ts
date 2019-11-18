
import { Port } from '../ports'

export interface ServiceDescriptor
{
	dockerComposeFile: string;
	serviceName: string;
	image: string;
	ports: ReadonlyArray< Port >;
}

export interface MatchResult
{
	ports: ReadonlyArray< Port >;
	final: boolean;
}

export interface Detector
{
	/**
	 * The name of the detector
	 */
	name: string;

	/**
	 * Matches a service descriptor and returns the container ports it can
	 * await.
	 */
	matches( service: ServiceDescriptor ): MatchResult;

	/**
	 * Wait for a set of ports given a service descriptor.
	 */
	waitFor( service: ServiceDescriptor ): Promise< void >;
}

export interface DetectorOptions
{
	/**
	 * Milliseconds until not retrying any more, but consider failure
	 */
	retryTime: number;

	/**
	 * Milliseconds until retrying again
	 */
	retryDelay: number;
}

export class RetryLimitError extends Error
{
	constructor( msg?: string )
	{
		super( msg ?? "Retry limit exceeded" );
	}
}
