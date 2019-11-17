import {
	parsePort,
	parsePorts,
	PortRangeMismatchError,
	InvalidPortSpecificationError,
	IncompletePort,
} from "./ports"

const expected: { [ key: string ]: Array< IncompletePort >; } = {
	"3000": [
		{
			container: 3000,
			proto: "tcp",
		},
	],
	"3000-3005": [
		{
			container: 3000,
			proto: "tcp",
		},
		{
			container: 3001,
			proto: "tcp",
		},
		{
			container: 3002,
			proto: "tcp",
		},
		{
			container: 3003,
			proto: "tcp",
		},
		{
			container: 3004,
			proto: "tcp",
		},
		{
			container: 3005,
			proto: "tcp",
		},
	],
	"8000:8000": [
		{
			container: 8000,
			host: 8000,
			proto: "tcp",
		},
	],
	"9090-9091:8080-8081": [
		{
			container: 8080,
			host: 9090,
			proto: "tcp",
		},
		{
			container: 8081,
			host: 9091,
			proto: "tcp",
		},
	],
	"49100:22": [
		{
			container: 22,
			host: 49100,
			proto: "tcp",
		},
	],
	"127.0.0.1:8001:8001": [
		{
			container: 8001,
			host: 8001,
			proto: "tcp",
			hostIP: "127.0.0.1",
		},
	],
	"127.0.0.1:6123-6125:5000-5002": [
		{
			container: 5000,
			host: 6123,
			proto: "tcp",
			hostIP: "127.0.0.1",
		},
		{
			container: 5001,
			host: 6124,
			proto: "tcp",
			hostIP: "127.0.0.1",
		},
		{
			container: 5002,
			host: 6125,
			proto: "tcp",
			hostIP: "127.0.0.1",
		},
	],
}

describe( "ports", ( ) =>
{
	for ( const [ key, value ] of Object.entries( expected ) )
	{
		test( key, ( ) =>
		{
			expect( parsePort( key ) ).toEqual( value );
		} );
	}

	test( "Long syntax tcp/host", ( ) =>
	{
		const spec = {
			target: 80,
			published: 8080,
			protocol: "tcp",
			mode: "host",
		};
		const expected = {
			container: 80,
			host: 8080,
			proto: "tcp",
			mode: "host",
		};
		expect( parsePort( spec ) ).toEqual( [ expected ] );
	} );

	test( "Long syntax udp/ingress", ( ) =>
	{
		const spec = {
			target: 80,
			published: 8080,
			protocol: "udp",
			mode: "ingress",
		};
		const expected = {
			container: 80,
			host: 8080,
			proto: "udp",
			mode: "ingress",
		};
		expect( parsePort( spec ) ).toEqual( [ expected ] );
	} );

	test( "Port range mismatch", ( ) =>
	{
		const spec = "5000-5001:6000-6002/udp";
		expect( ( ) => parsePort( spec ) ).toThrow( PortRangeMismatchError );
	} );

	test( "Invalid port spec, missing container", ( ) =>
	{
		const spec = "5000-5001:";
		expect( ( ) => parsePort( spec ) )
			.toThrow( InvalidPortSpecificationError );
	} );

	test( "Invalid port spec, missing protocol", ( ) =>
	{
		const spec = "5000-5001/";
		expect( ( ) => parsePort( spec ) )
			.toThrow( InvalidPortSpecificationError );
	} );

	test( "parsePorts", ( ) =>
	{
		const keys = Object.keys( expected );
		const values = ( [ ] as Array< IncompletePort > ).concat(
			...keys.map( key => expected[ key ] )
		);
		expect( parsePorts( keys ) ).toEqual( values );
	} );
} );
