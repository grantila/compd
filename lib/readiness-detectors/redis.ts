import * as redis from 'redis'

import {
	Detector,
	ServiceDescriptor,
	RetryLimitError,
	DetectorOptions,
} from './types'


export function makeDetector( opts: DetectorOptions ): Detector
{
	return {
		matches( service: ServiceDescriptor )
		{
			const matchByImageName = service.image.includes( 'redis' );

			if ( matchByImageName && service.ports.length === 1 )
			{
				// Just 1 port and image contains 'redis' ¯\_(ツ)_/¯
				return service.ports;
			}

			const found = service.ports.find( port =>
				port.container === 6379
			);

			return found ? [ found ] : [ ];
		},
		async waitFor( service: ServiceDescriptor )
		{
			const client = redis.createClient( {
				port: service.ports[ 0 ].host,
				retry_strategy( options )
				{
					if ( options.total_retry_time > opts.retryTime )
						return new RetryLimitError( );

					return opts.retryDelay;
				},
			} );

			try
			{
				await new Promise( ( resolve, reject ) =>
				{
					client.info( ( err, _info ) =>
					{
						if ( err )
							return reject( err );
						resolve( );
					} );
				} );
			}
			finally
			{
				await new Promise( ( resolve, reject) =>
				{
					client.quit( ( err, _ok ) =>
					{
						if ( err )
							return reject( err );
						resolve( );
					} );
				} );
			}
		},
	};
}
