import * as execa from 'execa'

import {
	Detector,
	ServiceDescriptor,
	RetryLimitError,
	DetectorOptions,
} from './types'
import { retry } from './utils'


async function pgCliInfo( dockerComposeFile: string, serviceName: string )
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
				'bash',
				'-c',
				"psql -U postgres -c 'select 4711'"
			],
			{
				stderr: process.stderr
			}
		);

		return stdout.includes( '4711' );
	}
	catch ( err )
	{
		return false;
	}
}

export function makeDetector( opts: DetectorOptions ): Detector
{
	return {
		name: "postgres",
		matches( service: ServiceDescriptor )
		{
			const matchByImageName =
				service.image.toLowerCase( ).includes( 'postgre' );

			if ( matchByImageName && service.ports.length === 1 )
			{
				// Just 1 port and image contains 'posgre' ¯\_(ツ)_/¯
				return { ports: service.ports, final: true };
			}

			const found = service.ports.find( port =>
				port.container === 5432 || port.container === 5433
			);

			return { ports: found ? [ found ] : [ ], final: true };
		},
		async waitFor( service: ServiceDescriptor )
		{
			const available = ( ) =>
				pgCliInfo( service.dockerComposeFile, service.serviceName );

			if ( !await retry( available, opts.retryDelay, opts.retryTime ) )
				throw new RetryLimitError( );
		},
	};
}
