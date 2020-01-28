/**
 * The specification for compose files declares the follow syntaxes.
 *
 * Short syntax of ports as:
 * - "3000"
 * - "3000-3005"
 * - "8000:8000"
 * - "9090-9091:8080-8081"
 * - "49100:22"
 * - "127.0.0.1:8001:8001"
 * - "127.0.0.1:5000-5010:5000-5010"
 * - "6060:6060/udp"
 *
 * Long syntax:
 *  - target: 80
 *    published: 8080
 *    protocol: tcp
 *    mode: host
 */

export class PortRangeMismatchError extends Error { }
export class InvalidPortSpecificationError extends Error { }

export type Protocol = 'tcp' | 'udp';
export type PortMode = 'host' | 'ingress';

export interface Port
{
	hostIP?: string;
	host: number;
	container: number;
	proto: Protocol;
	mode?: PortMode;
}

export type IncompletePort =
	Omit< Port, 'host' > & Partial< Pick< Port, 'host' > >;

/**
 * Parses:
 * - "3000"
 * - "3000-3005"
 * - "127.0.0.1:3000"
 * - "127.0.0.1:3000-3005"
 */
function parseHostOrContainerPorts( value: string )
: Array<{ hostIP?: string; port: number }>
{
	if ( value.includes( ':' ) )
	{
		const [ hostIP, port ] = value.split( ':' );
		return parseHostOrContainerPorts( port )
			.map( ( { port } ) => ( { hostIP, port } ) );
	}
	else
	{
		if ( value.includes( '-' ) )
		{
			const [ lower, upper ] = value.split( '-' );
			return makePortRange(
				parseInt( lower, 10 ),
				parseInt( upper, 10 )
			)
			.map(port => ( { port } ) );
		}
		else
		{
			return [ { port: parseInt( value, 10 ) }, ];
		}
	}
}

/**
 * Turns [3000, 3002] into [3000, 3001, 3002]
 */
function makePortRange( lower: number, uppper: number )
: Array< number >
{
	const ret: Array< number > = [ ];
	for ( let i = lower; i <= uppper; ++i )
		ret.push( i );
	return ret;
}

/**
 * Parses:
 * - "3000"
 * - "3000/udp"
 * - "3000-3005"
 * - "3000-3005/tcp"
 */
function parseContainerPorts( value: string )
: Array< IncompletePort >
{
	const m = value.match( /^([^/]+)(\/([^/]+))?$/ );
	if ( !m )
		throw new InvalidPortSpecificationError(
			`Invalid port definition: ${value}`
		);

	const [ , port, , protocol = 'tcp' ] = [ ...m ];
	const proto = protocol as Protocol;

	return parseHostOrContainerPorts( port )
	.map( ( { hostIP, port } ) => ( {
		hostIP,
		container: port,
		proto,
	} ) );
}

// Splits a string on the *last* colon
function splitHostContainer( value: string ): [ string, string ]
{
	const m = value.match( /^(.+):([^:]+)$/ );
	if ( !m )
		throw new InvalidPortSpecificationError(
			`Invalid port definition: ${value}`
		);
	return [ m[ 1 ], m[ 2 ] ];
}

function parsePortShort( value: string | number ): Array< IncompletePort >
{
	value = `${value}`;
	if ( value.includes( ':' ) )
	{
		const [ host, container ] = splitHostContainer( value );
		const portsHost = parseHostOrContainerPorts( host );
		const portsContainer = parseContainerPorts( container );
		if ( portsHost.length !== portsContainer.length )
			throw new PortRangeMismatchError(
				`Port range of different size: ${value}`
			);

		return portsContainer
			.map( ( { container, proto }, index) => ( {
				hostIP: portsHost[ index ].hostIP,
				host: portsHost[ index ].port,
				container,
				proto,
			} ) );
	}
	else
	{
		return parseContainerPorts( value );
	}
}

function parsePortLong( value: any): Array< Port >
{
	return [
		{
			host: value.published,
			container: value.target,
			proto: value.protocol || 'tcp',
			mode: value.mode || 'host',
		},
	]
}

export function parsePort( value: any ): Array< IncompletePort >
{
	return ( typeof value === 'string' || typeof value === 'number' )
		? parsePortShort( value )
		: parsePortLong( value );
}

export function parsePorts( values: ReadonlyArray< any > )
{
	return ( [ ] as Array< IncompletePort > )
		.concat( ...values.map( value => parsePort( value ) ) );
}
