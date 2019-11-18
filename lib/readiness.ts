import {
	ServiceDescriptor,
	Detector,
	MatchResult,
} from './readiness-detectors/types'
import { AppContext } from './app-context'

function cloneService(
	service: ServiceDescriptor,
	excludeHostPorts: Array< number >
)
: ServiceDescriptor
{
	return {
		...service,
		ports: service.ports.filter( port =>
			!excludeHostPorts.includes( port.host )
		),
	}
}

export class Readiness
{
	constructor(
		private appContext: AppContext,
		public detectors: ReadonlyArray< Detector >
	)
	{
	}

	async waitForService( service: ServiceDescriptor )
	{
		const findDetectors = ( ) =>
		{
			const matches: Array< MatchResult & { detector: Detector } > = [ ];
			let handledService = service;

			for ( let i = 0; i < this.detectors.length; ++i )
			{
				const detector = this.detectors[ i ];
				const match = detector.matches( handledService );
				if ( match.ports.length > 0 )
				{
					matches.push( { detector, ...match } );

					if ( match.final )
						handledService = cloneService(
							handledService,
							match.ports.map( port => port.host )
						);
				}
			}

			return matches;
		}

		const matches = findDetectors( );

		if ( matches.length === 0 || !matches[ matches.length - 1 ].final )
		{
			console.warn(
				`Service ${service.serviceName} not understood, ` +
				"cannot properly await it."
			);
			return;
		}

		for ( const match of matches )
		{
			const { detector, ports } = match;

			const waitableService: ServiceDescriptor = {
				...service,
				ports,
			};

			const hostPorts = ports.map( port => port.host ).join( ', ' );
			if ( this.appContext.verbose )
				console.log(
					`Service ${service.serviceName}: ${detector.name} ` +
					`detector, checks ports: ${hostPorts}`
				);

			await detector.waitFor( waitableService );
		}
	}

	async waitForServices( services: ReadonlyArray< ServiceDescriptor > )
	{
		await Promise.all(
			services.map( async service =>
				await this.waitForService( service )
			)
		);
	}
}
