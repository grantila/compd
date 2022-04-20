import * as execa from 'execa'

import { Detector, RetryLimitError, DetectorOptions } from './types'
import { retry } from './utils'
import { DockerComposeService } from '../docker-compose'


async function pgCliInfo(
	dockerComposeFile: string,
	serviceName: string,
	userName: string,
	dbName: string | undefined
)
{
	try
	{
		const dbNameArg = dbName ? `-d ${dbName}` : '';

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
				`psql -U ${userName} ${dbNameArg} -c 'select 4711'`
			]
		);

		return { ok: stdout.includes( '4711' ) };
	}
	catch ( err: any )
	{
		const { stderr = undefined as string | undefined } = err;
		return { ok: false, stderr };
	}
}

export function makeDetector( opts: DetectorOptions ): Detector
{
	return {
		name: "postgres",
		matches( service: DockerComposeService )
		{
			const name = service.image ?? service.name;
			const matchByImageName = name.toLowerCase( ).includes( 'postgre' );

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
		async waitFor( service: DockerComposeService )
		{
			const userName =
				service.environment[ 'POSTGRES_USER' ] || 'postgres';
			const dbName = service.environment[ 'POSTGRES_DB' ] || void 0;

			let stderror: string | undefined = undefined;
			const available = async ( ) =>
			{
				const { ok, stderr } = await pgCliInfo(
					service.dockerComposeFile,
					service.name,
					userName,
					dbName
				);
				stderror = stderr;
				return ok;
			};

			if ( !await retry( available, opts.retryDelay, opts.retryTime ) )
				throw new RetryLimitError( stderror );
		},
	};
}
