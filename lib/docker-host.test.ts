import {
	parseFromEnv,
	parseByRouteTable_ip,
	parseByRouteTable_route,
} from './docker-host'


const sbinIpReturn = `default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 proto kernel scope link src 172.17.0.2
`;

const routeReturn = `Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         172.17.0.1      0.0.0.0         UG    0      0        0 eth0
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 eth0
`;

jest.mock(
	'execa',
	( ) => async ( cmd: string, args: string[ ] ) =>
	( {
		stdout:
			cmd === '/sbin/ip'
			? sbinIpReturn
			: cmd === 'route'
			? routeReturn
			: ''
	} )
);

describe( 'docker-host', ( ) =>
{
	it( 'should fail parseFromEnv with non-env', async ( ) =>
	{
		expect( parseFromEnv( 'random env name', false ) )
			.toEqual( undefined );
	} );

	it( 'should parseFromEnv by env correctly (if ip)', async ( ) =>
	{
		process.env.ENV_X = '4.5.6.7';
		expect( parseFromEnv( 'ENV_X', false ) ).toEqual( '4.5.6.7' );
	} );

	it( 'should parseFromEnv by env correctly (if url)', async ( ) =>
	{
		process.env.ENV_Y = 'tcp://9.8.7.6:1234';
		expect( parseFromEnv( 'ENV_Y', false ) ).toEqual( '9.8.7.6' );
	} );

	it( 'should parseByRouteTable_ip correctly', async ( ) =>
	{
		expect( await parseByRouteTable_ip( ) ).toEqual( '172.17.0.1' );
	} );

	it( 'should parseByRouteTable_route correctly', async ( ) =>
	{
		expect( await parseByRouteTable_route( ) ).toEqual( '172.17.0.1' );
	} );
} );
