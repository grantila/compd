import { ensureKeyValues, parseComposeFile } from './docker-compose'

describe( 'docker-compose', ( ) =>
{
	it( 'ensureKeyValues', ( ) =>
	{
		expect( ensureKeyValues( undefined ) ).toStrictEqual( { } );
		expect( ensureKeyValues( [ "a=b", "c=d=e" ] ) ).toStrictEqual( {
			a: 'b',
			c: 'd=e',
		} );
		expect( ensureKeyValues( { a: 'b', c: 'd' } ) ).toStrictEqual( {
			a: 'b',
			c: 'd',
		} );
	} );

	describe( 'parseComposeFile', ( ) =>
	{
		it( 'key-values as object', ( ) =>
		{
			const data = parseComposeFile(
				'foo.yaml',
				{
					services: {
						foo: {
							image: 'bar',
							container_name: 'cname',
							environment: {
								a: 'b',
								c: 'd',
							},
							labels: {
								x: 'y',
								foo: 'bar',
							},
							ports: [ "4711" ],
						}
					}
				},
				'1.2.3.4'
			);

			expect( data ).toStrictEqual( [ {
				dockerComposeFile: 'foo.yaml',
				dockerHost: '1.2.3.4',
				name: 'foo',
				image: 'bar',
				containerName: 'cname',
				containerId: undefined,
				environment: { a: 'b', c: 'd' },
				labels: { x: 'y', foo: 'bar' },
				ports: [ {
					container: 4711,
					hostIP: undefined,
					proto: 'tcp',
				} ],
			} ] );
		} );

		it( 'key-values as array', ( ) =>
		{
			const data = parseComposeFile(
				'foo.yaml',
				{
					services: {
						foo: {
							image: 'bar',
							environment: [ 'a=b', 'c=d' ],
							labels: [ 'x=y', 'foo=bar' ],
							ports: [ "4711" ],
						}
					}
				},
				'1.2.3.4'
			);

			expect( data ).toStrictEqual( [ {
				dockerComposeFile: 'foo.yaml',
				dockerHost: '1.2.3.4',
				name: 'foo',
				image: 'bar',
				containerName: undefined,
				containerId: undefined,
				environment: { a: 'b', c: 'd' },
				labels: { x: 'y', foo: 'bar' },
				ports: [ {
					container: 4711,
					hostIP: undefined,
					proto: 'tcp',
				} ],
			} ] );
		} );
	} );
} );
