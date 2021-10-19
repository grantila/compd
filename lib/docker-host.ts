import { URL } from "url"
import { reflect } from 'already'
import * as execa from 'execa'


const fallback = '127.0.0.1';

export async function getDockerHost(
	dockerHostConfig: string,
	verbose: boolean
)
: Promise< string >
{
	if ( dockerHostConfig === 'env' || !dockerHostConfig )
		return parseFromEnv( 'DOCKER_HOST', verbose || !!dockerHostConfig )
			|| fallback;

	else if ( dockerHostConfig.startsWith( 'env:' ) )
		return parseFromEnv( dockerHostConfig.slice( 4 ), true ) || fallback;

	else if ( dockerHostConfig === 'route' )
		return parseByRouteTable( );

	else if ( dockerHostConfig.startsWith( 'host:' ) )
		return dockerHostConfig.slice( 5 );

	else if ( dockerHostConfig === 'no' )
		return fallback;

	throw new Error( `Invalid docker-host setting: ${dockerHostConfig}` );
}

export function parseFromEnv( envName: string, verbose: boolean )
{
	const value = process.env[ envName ];

	if ( typeof value !== 'string' || !value )
	{
		console.error(
			`Environment variable ${envName} not found. ` +
			`Defaulting to ${fallback}`
		);
		return undefined;
	}

	if ( !value.includes( ':/' ) )
		return value;

	try
	{
		const url = new URL( value );
		if ( url.protocol === 'tcp:' )
			return url.hostname;

		if ( verbose )
			console.error(
				`Environment variable ${envName} doesn't have tcp protocol. ` +
				`Defaulting to ${fallback}`
			);
		return undefined;
	}
	catch ( err )
	{
		if ( verbose )
			console.error(
				`Couldn't parse environment variable ${envName}. ` +
				`Defaulting to ${fallback}`
			);
		return undefined;
	}
}

async function parseByRouteTable( ): Promise< string >
{
	const [ byIp, byRoute ] = await Promise.all( [
		reflect( parseByRouteTable_ip( ) ),
		reflect( parseByRouteTable_route( ) ),
	] );

	if ( byIp.isRejected && byRoute.isRejected )
	{
		console.error(
			`Both ways of detecting docker host failed. ` +
			`Defaulting to ${fallback}`
		);
		console.error(
			`Running '/sbin/ip route' failed:\n` +
			indentError( ( byIp.error as any ).stderr )
		);
		console.error(
			`Running 'route -n' failed:\n` +
			indentError( ( byRoute.error as any ).stderr )
		);
		return fallback;
	}

	return byIp.isResolved ? byIp.value : byRoute.value!;
}

function indentError( msg: string = "" )
{
	return msg
		.split( "\n" )
		.map( line => `  ${line}` )
		.join( "\n" );
}

/**
 * Calls: '/sbin/ip route'
 * Expects something like:
 *    default via 172.17.0.1 dev eth0
 *    ^^^^^^^     ^^^^^^^^^^
 *    172.17.0.0/16 dev eth0 proto kernel scope link src 172.17.0.2
 * Picks the IP from the 'default' row
 */
export async function parseByRouteTable_ip( ): Promise< string >
{
	const { stdout } = await execa( '/sbin/ip', [ 'route' ] );

	const foundLine = stdout
		.split( '\n' )
		.filter( line => line.match( /^default/ ) )
		.map( line => line.replace( /\s+/g, ' ' ) )[ 0 ];

	if ( foundLine )
	{
		const ip = foundLine.split( ' ' )[ 2 ];
		if ( ip )
			return ip;
	}

	const err = new Error( );
	( err as any ).stderr = `Output doesn't contain default route:\n${stdout}`;
	throw err;
}

/**
 * Calls: 'route -n'
 * Expects something like:
 *    Kernel IP routing table
 *    Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
 *    0.0.0.0         172.17.0.1      0.0.0.0         UG    0      0        0 eth0
 *                    ^^^^^^^^^^                      ^^
 *    172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 eth0
 * Picks the IP from the 'UG' row
 */
export async function parseByRouteTable_route( ): Promise< string >
{
	const { stdout } = await execa( 'route', [ '-n' ] );

	const foundLine = stdout
		.split( '\n' )
		.filter( line => line.match( /\sUG\s/ ) )
		.map( line => line.replace( /\s+/g, ' ' ) )[ 0 ];

	if ( foundLine )
	{
		const ip = foundLine.split( ' ' )[ 1 ];
		if ( ip )
			return ip;
	}

	const err = new Error( );
	( err as any ).stderr = `Output doesn't contain UG:\n${stdout}`;
	throw err;
}
