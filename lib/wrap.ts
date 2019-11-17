import { ExecaChildProcess, ExecaReturnValue } from 'execa'
import * as execa from 'execa'

import { DockerCompose, DockerComposeService } from './docker-compose'
import { forwardSignals, ForwardSignalCleanup } from './process'
import { Readiness } from './readiness'
import { ServiceDescriptor, Detector } from './readiness-detectors/types'
import { makeRedisDetector } from './readiness-detectors/index'


function convertServiceToDescriptor(
	services: ReadonlyArray< DockerComposeService >
)
{
	return services.map( service =>
		{
			const serviceDescriptor: ServiceDescriptor = {
				serviceName: service.name,
				image: service.image,
				ports: service.ports,
			};
			return serviceDescriptor;
		}
	);
}

function makeReadinessDetectors( )
{
	return [
		makeRedisDetector( { retryDelay: 100, retryTime: 5000 } )
	];
}

export interface Options
{
	verbose: boolean;
	teardown: boolean;
	readinessDetectors: ReadonlyArray< Detector >;
}

export async function wrap(
	command: string,
	args: ReadonlyArray< string >,
	dockerComposeFile: string,
	{ verbose, teardown, readinessDetectors }: Partial< Options > = { }
)
: Promise< number >
{
	const dc = new DockerCompose( dockerComposeFile );
	const readiness = new Readiness(
		readinessDetectors ?? makeReadinessDetectors( )
	);

	let child: ExecaChildProcess;
	let completedChild: ExecaReturnValue | undefined = void 0;
	let unregisterSignals: ForwardSignalCleanup | undefined = void 0;

	try
	{
		const services = await dc.setup( );
		const env = dc.makePortEnvironmentVariables( );

		const serviceDescriptors = convertServiceToDescriptor( services );
		await readiness.waitForServices( serviceDescriptors );

		child = execa(
			command,
			args,
			{
				env,
				stdin: process.stdin,
				stdout: process.stdout,
				stderr: process.stderr,
			}
		);

		unregisterSignals = forwardSignals( signal =>
		{
			if ( signal === 'SIGCHLD' )
				return;

			child.kill( signal );
		} );

		completedChild = await child;
	}
	catch ( err )
	{
		if ( verbose )
			console.error( err.stack );
	}
	finally
	{
		if ( teardown !== false )
			await dc.teardown( );

		unregisterSignals?.( );

		return completedChild?.exitCode ?? 127;
	}
}
