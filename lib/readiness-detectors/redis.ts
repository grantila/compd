import * as execa from 'execa'

import {
	Detector,
	ServiceDescriptor,
	RetryLimitError,
	DetectorOptions,
} from './types'
import { retry } from './utils'


async function redisCliInfo( dockerComposeFile: string, serviceName: string )
{
	try
	{
		const { stdout } = await execa(
			'docker-compose',
			[
				'--file',
				dockerComposeFile,
				'exec',
				'-T',
				serviceName,
				'redis-cli',
				'info'
			],
			{
				stderr: process.stderr
			}
		);
		return stdout.includes( 'redis_version' );
	}
	catch ( err )
	{
		return false;
	}
}

export function makeDetector( opts: DetectorOptions ): Detector
{
	return {
		name: "redis",
		matches( service: ServiceDescriptor )
		{
			const matchByImageName =
				service.image.toLowerCase( ).includes( 'redis' );

			if ( matchByImageName && service.ports.length === 1 )
			{
				// Just 1 port and image contains 'redis' ¯\_(ツ)_/¯
				return { ports: service.ports, final: true };
			}

			const found = service.ports.find( port =>
				port.container === 6379
			);

			return { ports: found ? [ found ] : [ ], final: true };
		},
		async waitFor( service: ServiceDescriptor )
		{
			const available = ( ) =>
				redisCliInfo( service.dockerComposeFile, service.serviceName );

			if ( !await retry( available, opts.retryDelay, opts.retryTime ) )
				throw new RetryLimitError( );
		},
	};
}
