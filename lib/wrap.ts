import { ExecaChildProcess, ExecaReturnValue } from 'execa'
import * as execa from 'execa'

import { DockerCompose, DockerComposeService } from './docker-compose'
import { forwardSignals, ForwardSignalCleanup } from './process'
import { Readiness } from './readiness'
import { ServiceDescriptor, Detector } from './readiness-detectors/types'
import { makeRedisDetector } from './readiness-detectors/index'
import { AppContext } from './app-context'


function convertServiceToDescriptor(
	services: ReadonlyArray< DockerComposeService >,
	dockerComposeFile: string
)
{
	return services.map( service =>
		{
			const serviceDescriptor: ServiceDescriptor = {
				dockerComposeFile,
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
	appContext: AppContext;
	readinessDetectors?: ReadonlyArray< Detector >;
}

export async function wrap(
	command: string,
	args: ReadonlyArray< string >,
	dockerComposeFile: string,
	{ appContext, readinessDetectors }: Options
)
: Promise< number >
{
	const dc = new DockerCompose( dockerComposeFile );
	const readiness = new Readiness(
		appContext,
		readinessDetectors ?? makeReadinessDetectors( )
	);

	let child: ExecaChildProcess;
	let completedChild: ExecaReturnValue | undefined = void 0;
	let unregisterSignals: ForwardSignalCleanup | undefined = void 0;

	try
	{
		const services = await dc.setup( );
		const env = dc.makePortEnvironmentVariables( );

		const serviceDescriptors =
			convertServiceToDescriptor( services, dc.dockerComposeFile );
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
		if ( appContext.verbose )
			console.error( err.stack );
	}
	finally
	{
		if ( appContext.teardown !== false )
			await dc.teardown( );

		unregisterSignals?.( );

		return completedChild?.exitCode ?? 127;
	}
}
