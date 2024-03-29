import { promisify } from 'util'
import * as fs from 'fs'
import * as execa from 'execa'
import { load as loadYaml } from 'js-yaml'
import { StrictKeyValue } from './docker-compose'
import { AppContext } from './app-context'

const readFile = promisify( fs.readFile );


export function quote( text: string )
{
	return text.replace( /(?<![\\])"/g, '\\"' );
}

export function makeArgsFromEnvironment( env: StrictKeyValue ): Array< string >
{
	return ( [ ] as Array< string > ).concat(
		...Object.entries( env ).map( ( [ key, value ] ) => [
			'-e', `'${ key }=${ quote( value ) }'`
		] )
	);
}

export interface DockerComposeExec
{
	loadFile( ): Promise< unknown >;
	bringUp( ): Promise< void >;
	teardown( ): Promise< void >;
	getContainerId( serviceName: string ): Promise< string >;
	getHostPort( serviceName: string, containerPort: number ): Promise< {
		serviceName: string;
		container: number;
		hostIP: string;
		host: number;
	} >;
}

export class DefaultDockerComposeExec implements DockerComposeExec
{
	constructor(
		private appContext: AppContext,
		public dockerComposeFile: string
	)
	{ }

	async loadFile( )
	{
		const content = await readFile( this.dockerComposeFile, 'utf8' );
		return loadYaml( content );
	}

	async bringUp( )
	{
		const upArgs = [
			...( this.appContext.build ? [ '--build' ] : [ ] ),
			'--detach',
		];
		await execa(
			'docker-compose',
			[ '--file', this.dockerComposeFile, 'up', ...upArgs ],
			{
				stdin: process.stdin,
				stdout: process.stdout,
				stderr: process.stderr,
			}
		);
	}

	async teardown( )
	{
		await execa(
			'docker-compose',
			[ '--file', this.dockerComposeFile, 'down' ],
			{
				stdin: process.stdin,
				stdout: process.stdout,
				stderr: process.stderr,
			}
		);
	}

	async getContainerId( serviceName: string )
	{
		const { stdout } = await execa(
			'docker-compose',
			[
				'--file',
				this.dockerComposeFile,
				'ps',
				'--quiet',
				serviceName,
			],
			{
				stdin: process.stdin,
				stderr: process.stderr,
			}
		);

		return stdout;
	}

	async getHostPort( serviceName: string, containerPort: number )
	{
		const { stdout } = await execa(
			'docker-compose',
			[
				'-f',
				this.dockerComposeFile,
				'port',
				serviceName,
				`${containerPort}`,
			],
			{
				stdin: process.stdin,
				stderr: process.stderr,
			}
		);

		const [ hostIP, host ] = stdout.split( ':' );
		return {
			serviceName,
			container: containerPort,
			hostIP,
			host: parseInt(host, 10),
		};
	}
}
