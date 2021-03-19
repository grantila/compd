import { quote } from './docker-compose-exec'

describe( 'docker-compose-exec', ( ) =>
{
	it( 'quote args', ( ) =>
	{
		expect( quote( 'foo' ) ).toBe( 'foo' );
		expect( quote( 'foo"bar' ) ).toBe( 'foo\\"bar' );
		expect( quote( 'foo\\"bar' ) ).toBe( 'foo\\"bar' );
	} );
} );
