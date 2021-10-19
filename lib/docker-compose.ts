import * as path from 'path'
import * as fs from 'fs'
import { map } from 'already'

import { Port, parsePorts } from './ports'
import {
	DockerComposeExec,
	DefaultDockerComposeExec,
} from './docker-compose-exec'


export class NotSetupError extends Error { }

export type AnyKeyValue =
	| Record< string, string | number | boolean | null >
	| Array< string >;

export type StrictKeyValue = Record< string, string >;

export interface DockerComposeService
{
	dockerComposeFile: string;
	dockerHost: string;
	name: string;
	image: string;
	containerName: string;
	containerId: string;
	environment: StrictKeyValue;
	labels: StrictKeyValue;
	ports: Array< Port >;
}

export function ensureKeyValues( data: AnyKeyValue | undefined )
: StrictKeyValue
{
	const ret: StrictKeyValue = { };

	if ( data == null )
		return ret;
	else if ( Array.isArray( data ) )
		data.forEach( line =>
		{
			const [ key, ...values ] = line.split( '=' );
			ret[ key ] = values.join( '=' );
		} );
	else
		for ( const [ key, value ] of Object.entries( data ) )
			ret[ key ] = `${value}`;

	return ret;
}

export function parseComposeFile(
	dockerComposeFile: string,
	composeFileData: any,
	dockerHost: string
)
: Array< DockerComposeService >
{
	return Object.keys( composeFileData.services )
		.map( serviceName => ( {
			name: serviceName,
			service: composeFileData.services[ serviceName ],
		} ) )
		.map( ( { name, service } ) => ( {
			dockerComposeFile,
			dockerHost,
			name,
			image: service.image,
			containerName: service.container_name,
			containerId: void 0 as any as string, // Will be deduced
			environment: ensureKeyValues( service.environment ),
			labels: ensureKeyValues( service.labels ),
			ports: parsePorts( service.ports || [ ] ) as Array< Port >,
		} ) );
}

function getFileFromCwd( file: string )
{
	return path.isAbsolute( file )
		? file
		: path.normalize( path.join( process.cwd( ), file ) );
}

function getDockerComposeFilename( file: string ): string
{
	if ( file === '' ) // Auto-detect
	{
		const yml = getFileFromCwd( 'docker-compose.yml' );
		const yaml = getFileFromCwd( 'docker-compose.yaml' );
		if ( fs.existsSync( yml ) )
			return yml;
		else if ( fs.existsSync( yaml ) )
			return yaml;
		else
			throw new Error( `Cannot find docker-compose.[yml|yaml]` );
	}

	file = getFileFromCwd( file );
	if ( !fs.existsSync( file ) )
		throw new Error( `Cannot find file: ${file}` );

	return file;
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
		this.dockerComposeFile = getDockerComposeFilename( dockerComposeFile );

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

		this.ensureLoaded( ).services.forEach(
			( { dockerHost, name, ports } ) =>
		{
			env[ `${ name }_host`.toUpperCase( ) ] = dockerHost;

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

	async setup( dockerHost: string )
	{
		const parse = async ( ) =>
		{
			this.services = parseComposeFile(
				this.dockerComposeFile,
				await this.dockerComposeExec.loadFile( ),
				dockerHost
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
