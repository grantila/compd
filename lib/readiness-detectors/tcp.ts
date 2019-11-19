import * as net from 'net'
import { map } from 'already'

import { Detector, RetryLimitError, DetectorOptions } from './types'
import { retry } from './utils'
import { DockerComposeService } from '../docker-compose'


export function makeDetector( opts: DetectorOptions ): Detector
{
	return {
		name: "tcp",
		matches( service: DockerComposeService )
		{
			return {
				ports: service.ports.filter( port => port.proto === 'tcp' ),
				final: false,
			};
		},
		async waitFor( service: DockerComposeService )
		{
			const ports = service.ports.map( port => port.host );

			const available = async ( port: number ) =>
			{
				return new Promise< boolean >( resolve =>
				{
					const stream = net.createConnection( port );

					stream.on( 'connect', ( ) =>
					{
						stream.destroy( );
						resolve( true );
					} );

					const events = [ 'error', 'close', 'timeout' ];
					events.forEach( event =>
						stream.on( event, ( ) =>
						{
							stream.destroy( );
							resolve( false );
						} )
					);
				} );
			};

			const retryPort = async ( port: number ) =>
			{
				const isUp = await retry(
					( ) => available( port ),
					opts.retryDelay,
					opts.retryTime
				);
				if ( !isUp )
					throw new RetryLimitError( `Port ${port} is not open` );
			}

			await map(
				ports,
				{ concurrency: Infinity },
				port => retryPort( port )
			);
		},
	};
}
