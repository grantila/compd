import * as path from 'path'
import { map } from 'already'

import { Port, parsePorts } from './ports'
import {
	DockerComposeExec,
	DefaultDockerComposeExec,
} from './docker-compose-exec'


export class NotSetupError extends Error { }

export type KeyValue = { [ key: string ]: string; };

export interface DockerComposeService
{
	dockerComposeFile: string;
	name: string;
	image: string;
	containerName: string;
	containerId: string;
	environment: KeyValue;
	labels: KeyValue;
	ports: Array< Port >;
}

function parseLabels( labels: Array< string > )
{
	const ret: DockerComposeService[ 'labels' ] = { };

	labels.forEach( line =>
	{
		const [ key, ...values ] = line.split( '=' );
		ret[ key ] = values.join( '=' );
	} );

	return ret;
}

function parseComposeFile( dockerComposeFile: string, composeFileData: any )
: Array< DockerComposeService >
{
	return Object.keys( composeFileData.services )
		.map( serviceName => ( {
			name: serviceName,
			service: composeFileData.services[ serviceName ],
		} ) )
		.map( ( { name, service } ) => ( {
			dockerComposeFile,
			name,
			image: service.image,
			containerName: service.container_name,
			containerId: void 0 as any as string, // Will be deduced
			environment: service.environment || { },
			labels: parseLabels( service.labels || [ ] ),
			ports: parsePorts( service.ports || [ ] ) as Array< Port >,
		} ) );
}

function getFileFromCwd( file: string )
{
	return path.isAbsolute( file )
		? file
		: path.normalize( path.join( process.cwd( ), file ) );
}

export class DockerCompose
{
	public dockerComposeFile: string;

	private services?: ReadonlyArray< DockerComposeService >;
	private dockerComposeExec: DockerComposeExec;

	constructor(
		dockerComposeFile: string,
		dockerComposeExec?: DockerComposeExec
	)
	{
		if ( !dockerComposeFile )
			throw new Error( "DockerCompose: Misssing argument" );

		this.dockerComposeFile = getFileFromCwd( dockerComposeFile );

		this.dockerComposeExec = dockerComposeExec ??
			new DefaultDockerComposeExec( this.dockerComposeFile );
	}

	private ensureLoaded( )
	{
		if ( !this.services )
			throw new NotSetupError( "Docker compose not yet brought up" );
		return { services: this.services };
	}

	private async getHostPorts( )
	{
		const { services } = this.ensureLoaded( );

		await Promise.all(
			services
			.filter( service => !service.containerName )
			.map( async service =>
			{
				const { name } = service;
				const id = await this.dockerComposeExec.getContainerId( name );
				service.containerName = id;
			} )
		);

		const containerPorts =
			( [ ] as Array< { serviceName: string; port: number } > ).concat(
				...services.map( ( { name, ports } ) =>
					ports.map( ( { container } ) => ( {
						serviceName: name,
						port: container,
					} ) )
				)
			);

		const portMaps = await map(
			containerPorts,
			{ concurrency: 8 },
			async ({ serviceName, port }) =>
				this.dockerComposeExec.getHostPort( serviceName, port )
		)

		portMaps.forEach( ( { serviceName, container, host, hostIP } ) =>
		{
			const service =
				services.find( service => service.name === serviceName );
			if ( !service )
				throw new Error(
					`Internal error, cannot find service ${serviceName}`
				);

			const port =
				service.ports.find( port => port.container === container );
			if ( !port )
				throw new Error(
					`Internal error, cannot find port ${container} ` +
					`for service ${serviceName}`
				);

			port.host = host;
			port.hostIP = hostIP || port.hostIP;
		} );
	}

	makePortEnvironmentVariables( )
	{
		const env: { [ key: string ]: string } = { };

		this.ensureLoaded( ).services.forEach( ( { name, ports } ) =>
		{
			ports.forEach( ( { container, host } ) =>
			{
				const envName = `${ name }_port_${ container }`.toUpperCase( );
				env[ envName ] = '' + host;
			} );

			if ( ports.length === 1 )
			{
				// If only one port exists, create a shortcut env var
				const { host } = ports[ 0 ];
				const envName = `${ name }_port`.toUpperCase( );
				env[ envName ] = '' + host;
			}
		} );

		return env;
	}

	private async bringUp( )
	{
		await this.dockerComposeExec.bringUp( );
	}

	async setup( )
	{
		const parse = async ( ) =>
		{
			this.services = parseComposeFile(
				this.dockerComposeFile,
				await this.dockerComposeExec.loadFile( )
			);
		};

		await Promise.all( [ this.bringUp( ), parse( ) ] );
		await this.getHostPorts( );

		return this.services || [ ];
	}

	async teardown( )
	{
		await this.dockerComposeExec.teardown( );
	}
}
