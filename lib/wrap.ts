import { ExecaChildProcess, ExecaReturnValue } from 'execa'
import * as execa from 'execa'

import { DockerCompose } from './docker-compose'
import { forwardSignals, ForwardSignalCleanup } from './process'
import { Readiness } from './readiness'
import { Detector, RetryLimitError } from './readiness-detectors/types'
import { AppContext } from './app-context'
import {
	makeRedisDetector,
	makeTCPDetector,
	makePostgresDetector,
} from './readiness-detectors/index'


function makeReadinessDetectors( )
{
	return [
		makeTCPDetector( { retryDelay: 100, retryTime: 5000 } ),
		makeRedisDetector( { retryDelay: 100, retryTime: 5000 } ),
		makePostgresDetector( { retryDelay: 200, retryTime: 15000 } ),
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
	const dc = new DockerCompose( appContext, dockerComposeFile );
	const readiness = new Readiness(
		appContext,
		readinessDetectors ?? makeReadinessDetectors( )
	);

	let child: ExecaChildProcess;
	let completedChild: ExecaReturnValue | undefined = void 0;
	let unregisterSignals: ForwardSignalCleanup | undefined = void 0;

	try
	{
		const dockerHost = await appContext.getDockerHost( );
		const services = await dc.setup( dockerHost );
		const env = dc.makePortEnvironmentVariables( );

		if ( appContext.verbose )
			console.log( "Exposing environment variables:", env );

		await readiness.waitForServices( services );

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
	catch ( err: any )
	{
		if ( err instanceof RetryLimitError )
			console.error( err.message );
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
